import { gateway, stepCountIs, tool, ToolLoopAgent, type LanguageModel, type ToolSet } from "ai";
import { getEnv } from "@/env";
import { keys, TTL } from "@/lib/cache/keys";
import { getCache } from "@/lib/cache/store";
import { isUnderTokenCap, normalizeQuestion, recordTokens, TOKEN_CAP_MESSAGE } from "./guards";
import { ASK_SYSTEM_PROMPT, OUT_OF_SCOPE_REPLY, REFUSAL_MARKER } from "./prompt";
import { aiToolImplementations, aiToolSchemas, type AiToolName } from "./tools";
import { findUnsupportedNumbers } from "./verify";

/** Ask Mandiport: grounded answers from the tools only (SPEC §8.7). */

export interface AskResult {
  status: "answered" | "refused" | "unavailable" | "no_data";
  answer: string;
  /** What was called, for the "Data used" disclosure. */
  toolCalls: { tool: string; input: unknown; output: unknown }[];
  cached: boolean;
  tokens?: number;
}

const TOOL_DESCRIPTIONS: Record<AiToolName, string> = {
  list_crops: "List commodities that have recent mandi price data. Use to check available crop names.",
  get_latest_prices:
    "Latest reported price for a crop, optionally for one state or one market, with its date.",
  get_price_trend: "Price trend over a number of days (7-365) for a crop, optionally by state or market.",
  compare_markets: "Compare the latest prices across markets in one state, highest first.",
  get_msp: "Minimum support price for a crop, by marketing season.",
  get_export_summary: "Annual export value of the export group a crop belongs to, most recent years first.",
  get_top_destinations: "Top destination countries by export value for a crop's export group.",
};

export function buildTools(
  onCall: (call: { tool: string; input: unknown; output: unknown }) => void,
): ToolSet {
  const entries = (Object.keys(aiToolImplementations) as AiToolName[]).map((name) => [
    name,
    tool({
      description: TOOL_DESCRIPTIONS[name],
      inputSchema: aiToolSchemas[name],
      execute: async (input: unknown) => {
        // Arguments are validated by the SDK against the schema; validate again for safety.
        const parsed = aiToolSchemas[name].safeParse(input);
        if (!parsed.success) return { error: "Invalid arguments for this tool." };
        const implementation = aiToolImplementations[name] as (
          args: unknown,
        ) => Promise<Record<string, unknown>>;
        const output = await implementation(parsed.data);
        onCall({ tool: name, input: parsed.data, output });
        return output;
      },
    }),
  ]);
  return Object.fromEntries(entries) as ToolSet;
}

export interface AskOptions {
  question: string;
  /** Injected in tests. */
  model?: LanguageModel;
  now?: Date;
  useCache?: boolean;
}

export async function ask({
  question,
  model,
  now = new Date(),
  useCache = true,
}: AskOptions): Promise<AskResult> {
  const env = getEnv();
  const normalized = normalizeQuestion(question);
  const cache = await getCache();

  if (useCache) {
    const hit = await cache.getJson<AskResult>(keys.ask(normalized)).catch(() => null);
    if (hit) return { ...hit, cached: true };
  }

  if (!model && (!env.AI_GATEWAY_API_KEY || !env.AI_MODEL_ID)) {
    return {
      status: "unavailable",
      answer: "AI answers are not configured on this site yet.",
      toolCalls: [],
      cached: false,
    };
  }
  if (!(await isUnderTokenCap(now))) {
    return { status: "unavailable", answer: TOKEN_CAP_MESSAGE, toolCalls: [], cached: false };
  }

  const toolCalls: AskResult["toolCalls"] = [];
  // AI SDK 7 runs the tool loop through an agent; generateText alone would not execute tools.
  const agent = new ToolLoopAgent({
    model: model ?? gateway(env.AI_MODEL_ID!),
    instructions: ASK_SYSTEM_PROMPT,
    tools: buildTools((call) => toolCalls.push(call)),
    stopWhen: stepCountIs(6),
    temperature: 0,
    maxOutputTokens: 500,
  });
  const result = await agent.generate({ prompt: question });

  const tokens = result.usage?.totalTokens ?? 0;
  await recordTokens(tokens, now);

  const text = result.text.trim();
  if (text.includes(REFUSAL_MARKER) || toolCalls.length === 0) {
    const refusal: AskResult = {
      status: text.includes(REFUSAL_MARKER) ? "refused" : "no_data",
      answer: text.includes(REFUSAL_MARKER)
        ? OUT_OF_SCOPE_REPLY
        : text || "I could not find data for that question on Mandiport.",
      toolCalls,
      cached: false,
      tokens,
    };
    return refusal;
  }

  const unsupported = findUnsupportedNumbers(
    text,
    toolCalls.map((c) => c.output),
  );
  if (unsupported.length > 0) {
    // An answer containing figures the data did not provide is never shown.
    return {
      status: "no_data",
      answer:
        "I could not answer that safely: the reply contained figures that are not in our data. Try asking about one crop and place, for example “onion price in Nashik”.",
      toolCalls,
      cached: false,
      tokens,
    };
  }

  const answered: AskResult = { status: "answered", answer: text, toolCalls, cached: false, tokens };
  if (useCache)
    await cache.setJson(keys.ask(normalized), { ...answered, tokens: undefined }, TTL.ask).catch(() => {});
  return answered;
}
