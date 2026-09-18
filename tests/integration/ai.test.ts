import { sql } from "drizzle-orm";
import type { LanguageModelV4GenerateResult } from "@ai-sdk/provider";
import { MockLanguageModelV4 } from "ai/test";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ask } from "@/lib/ai/ask";
import { buildBriefFacts, generateBrief } from "@/lib/ai/briefs";
import { normalizeQuestion, recordTokens, tokensUsedToday } from "@/lib/ai/guards";
import { OUT_OF_SCOPE_REPLY, REFUSAL_MARKER } from "@/lib/ai/prompt";
import { aiToolImplementations } from "@/lib/ai/tools";
import { findUnsupportedNumbers } from "@/lib/ai/verify";
import { NoopStore, setCacheForTesting } from "@/lib/cache/store";
import { closeTestDb, resetDb, testDb } from "../helpers/db";

/** AI guard tests (SPEC §12): grounding, refusals, argument validation and the token cap. */

const ASOF = "2026-09-16";

async function seed() {
  const db = testDb();
  await db.execute(sql`insert into states (name, slug) values ('Maharashtra', 'maharashtra')`);
  await db.execute(sql`insert into districts (state_id, name, slug) values (1, 'Nashik', 'nashik')`);
  await db.execute(
    sql`insert into markets (district_id, name, slug) values (1, 'Lasalgaon', 'lasalgaon'), (1, 'Pimpalgaon', 'pimpalgaon')`,
  );
  await db.execute(sql`
    insert into commodities (source_name, display_name, slug, tier, markets_reporting_90d, days_reported_90d)
    values ('Onion', 'Onion', 'onion', 1, 60, 70)`);
  await db.execute(sql`
    insert into prices_daily (arrival_date, market_id, commodity_id, source, min_price, max_price, modal_price)
    select ${ASOF}::date - d, m, 1, 2, 2300, 2600, 2400 + d * 10 + m from generate_series(0, 40) d, generate_series(1, 2) m`);
  await db.execute(sql`
    insert into prices_state_daily (arrival_date, state_id, commodity_id, median_modal, markets_reporting)
    select ${ASOF}::date - d, 1, 1, 2400 + d * 10, 2 from generate_series(0, 40) d`);
  await db.execute(sql`
    insert into prices_national_daily (arrival_date, commodity_id, median_modal, min_modal, max_modal, markets_reporting, states_reporting)
    select ${ASOF}::date - d, 1, 2400 + d * 10, 2300, 2600, 2, 1 from generate_series(0, 40) d`);
  await db.execute(sql`
    insert into msp (source_name, variety, commodity_id, season, year, msp_price, resource_id)
    values ('Onion', null, 1, 'kharif', '2024-25', 2000, 'test')`);
}

const usage = (input: number, output: number) => ({
  inputTokens: { total: input, noCache: input, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: output, text: output, reasoning: undefined },
  totalTokens: input + output,
});

/** A model that calls one tool, then answers with the given text. */
function scriptedModel(toolCall: { name: string; input: unknown } | null, answer: string) {
  let step = 0;
  const doGenerate = async (): Promise<LanguageModelV4GenerateResult> => {
    step++;
    if (step === 1 && toolCall) {
      return {
        content: [
          {
            type: "tool-call" as const,
            toolCallId: "call-1",
            toolName: toolCall.name,
            input: JSON.stringify(toolCall.input),
          },
        ],
        finishReason: { unified: "tool-calls" as const, raw: "tool_calls" },
        usage: usage(100, 20),
        warnings: [],
      };
    }
    return {
      content: [{ type: "text" as const, text: answer }],
      finishReason: { unified: "stop" as const, raw: "stop" },
      usage: usage(200, 60),
      warnings: [],
    };
  };
  return new MockLanguageModelV4({ doGenerate });
}

describe("AI tools", () => {
  beforeEach(async () => {
    await resetDb();
    setCacheForTesting(new NoopStore());
    await seed();
  });
  afterAll(async () => {
    setCacheForTesting(undefined);
    await closeTestDb();
  });

  it("returns real figures with dates", async () => {
    const result = await aiToolImplementations.get_latest_prices({ crop: "Onion" });
    expect(result).toMatchObject({
      crop: "Onion",
      scope: "India",
      date: "16 Sep 2026",
      markets_reporting: 2,
    });
  });

  it("resolves misspelt names by similarity", async () => {
    const result = await aiToolImplementations.get_latest_prices({ crop: "onnion", state: "maharastra" });
    expect(result).toMatchObject({ crop: "Onion", state: "Maharashtra" });
  });

  it("says plainly when a name is unknown instead of guessing", async () => {
    expect(await aiToolImplementations.get_latest_prices({ crop: "unobtainium" })).toEqual({
      error: 'No crop named "unobtainium" was found in the data.',
    });
  });

  it("reports missing data rather than an empty answer", async () => {
    expect(await aiToolImplementations.get_export_summary({ crop: "Onion", years: 5 })).toMatchObject({
      note: "No export data is mapped to this crop.",
    });
  });

  it("compares markets within a state", async () => {
    const result = (await aiToolImplementations.compare_markets({
      crop: "Onion",
      state: "Maharashtra",
      limit: 5,
    })) as {
      markets: { market: string }[];
    };
    expect(result.markets.map((m) => m.market).sort()).toEqual(["Lasalgaon", "Pimpalgaon"]);
  });
});

describe("ask", () => {
  beforeEach(async () => {
    await resetDb();
    setCacheForTesting(new NoopStore());
    await seed();
  });
  afterAll(async () => {
    setCacheForTesting(undefined);
    await closeTestDb();
  });

  it("answers from tool results and lists the data used", async () => {
    const result = await ask({
      question: "What is the onion price?",
      model: scriptedModel(
        { name: "get_latest_prices", input: { crop: "Onion" } },
        "The national median onion price was ₹2,400 per quintal on 16 Sep 2026, from 2 markets.",
      ),
      useCache: false,
    });
    expect(result.status).toBe("answered");
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]!.tool).toBe("get_latest_prices");
    expect(result.answer).toContain("16 Sep 2026");
  });

  it("refuses out-of-scope questions with a helpful message", async () => {
    const result = await ask({
      question: "Who won the cricket match?",
      model: scriptedModel(null, REFUSAL_MARKER),
      useCache: false,
    });
    expect(result.status).toBe("refused");
    expect(result.answer).toBe(OUT_OF_SCOPE_REPLY);
  });

  it("never shows an answer containing figures the data did not provide", async () => {
    const result = await ask({
      question: "What is the onion price?",
      model: scriptedModel(
        { name: "get_latest_prices", input: { crop: "Onion" } },
        "Onion was ₹7,777 per quintal and will reach ₹9,500 next week.",
      ),
      useCache: false,
    });
    expect(result.status).toBe("no_data");
    expect(result.answer).not.toContain("7,777");
  });

  it("rejects invalid tool arguments without calling the database", async () => {
    const result = await ask({
      question: "Trend please",
      model: scriptedModel(
        { name: "get_price_trend", input: { crop: "Onion", days: 5000 } },
        "Here is the trend.",
      ),
      useCache: false,
    });
    expect(result.toolCalls).toHaveLength(0);
    expect(result.status).toBe("no_data");
  });

  it("stops when the daily token cap is reached", async () => {
    await recordTokens(10_000_000);
    const result = await ask({
      question: "What is the onion price?",
      model: scriptedModel(null, "unused"),
      useCache: false,
    });
    expect(result.status).toBe("unavailable");
    expect(result.answer).toContain("back");
    expect(await tokensUsedToday()).toBeGreaterThan(0);
  });

  it("normalizes questions for caching", () => {
    expect(normalizeQuestion("  What is the ONION price? ")).toBe("what is the onion price");
  });
});

describe("weekly briefs", () => {
  beforeEach(async () => {
    await resetDb();
    setCacheForTesting(new NoopStore());
    await seed();
  });
  afterAll(async () => {
    setCacheForTesting(undefined);
    await closeTestDb();
  });

  it("computes facts in code, including MSP gap and top markets", async () => {
    const facts = await buildBriefFacts(testDb(), 1, "Onion", ASOF);
    expect(facts.latest).toMatchObject({ date: ASOF, markets: 2 });
    expect(facts.weekStart).toBe("2026-09-14");
    expect(facts.topMarkets.length).toBeGreaterThan(0);
    expect(facts.msp).toMatchObject({ price: 2000 });
    expect(facts.weekChangePercent).not.toBeNull();
  });

  it("writes a draft with a headline and body from the facts", async () => {
    const facts = await buildBriefFacts(testDb(), 1, "Onion", ASOF);
    const body =
      `Onion prices held near ₹${facts.latest!.price} per quintal on 16 Sep 2026, with ${facts.latest!.markets} markets reporting. ` +
      "Prices in Maharashtra were similar through the week, and the figure stays above the support price. " +
      "This brief describes reported data only and does not forecast prices or advise on selling.";
    const brief = await generateBrief(facts, {
      model: scriptedModel(null, `Onion steady near support price\n\n${body}`),
    });
    expect(brief).not.toBeNull();
    expect(brief!.headline).toBe("Onion steady near support price");
    expect(brief!.bodyMd).toContain("markets reporting");
  });

  it("discards a brief that invents a figure", async () => {
    const facts = await buildBriefFacts(testDb(), 1, "Onion", ASOF);
    const brief = await generateBrief(facts, {
      model: scriptedModel(
        null,
        "Onion soars\n\nOnion reached ₹8,888 per quintal on 16 Sep 2026 and traders expect ₹9,999 next week, which is well above every other market reported this week in the state.".padEnd(
          160,
          ".",
        ),
      ),
    });
    expect(brief).toBeNull();
  });
});

describe("number verification", () => {
  it("accepts figures and differences drawn from tool results", () => {
    const tools = [{ price: 2400, previous: 2200, markets: 412 }];
    expect(
      findUnsupportedNumbers("₹2,400 is ₹200 above ₹2,200, about 9.1% up, across 412 markets.", tools),
    ).toEqual([]);
  });

  it("flags figures that appear nowhere", () => {
    expect(findUnsupportedNumbers("The price was ₹5,555 per quintal.", [{ price: 2400 }])).toEqual([5555]);
  });

  it("ignores years and small counts", () => {
    expect(
      findUnsupportedNumbers("In 2026, 3 markets reported, 100 kg per quintal.", [{ price: 2400 }]),
    ).toEqual([]);
  });
});
