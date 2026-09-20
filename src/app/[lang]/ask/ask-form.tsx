"use client";

import type { Dictionary } from "@/content/i18n/en";

import { useState } from "react";
import { Field, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";

interface AskResponse {
  status: "answered" | "refused" | "unavailable" | "no_data";
  answer: string;
  toolCalls: { tool: string; input: unknown; output: unknown }[];
  cached: boolean;
  error?: string;
}

type AskLabels = Dictionary["ask"];

function toolLabels(labels: AskLabels): Record<string, string> {
  return {
    list_crops: labels.toolCropList,
    get_latest_prices: labels.toolLatestPrices,
    get_price_trend: labels.toolPriceTrend,
    compare_markets: labels.toolCompareMarkets,
    get_msp: labels.toolMsp,
    get_export_summary: labels.toolExportSummary,
    get_top_destinations: labels.toolTopDestinations,
  };
}

export function AskForm({
  examples,
  disabled,
  labels,
}: {
  examples: string[];
  disabled: boolean;
  labels: AskLabels;
}) {
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<{
    status: "idle" | "loading" | "error";
    data?: AskResponse;
    message?: string;
  }>({ status: "idle" });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (question.trim().length < 5) return;
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = (await response.json()) as AskResponse & { error?: string };
      if (!response.ok) {
        setState({ status: "error", message: data.error ?? labels.genericError });
        return;
      }
      setState({ status: "idle", data });
      if (data.status === "refused") track("ask_refused", { reason: "out_of_scope" });
      else
        track("ask_question", {
          answered: data.status === "answered",
          tools_called_count: data.toolCalls.length,
        });
    } catch {
      setState({ status: "error", message: labels.requestFailed });
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="bg-card space-y-3 rounded-lg border p-4">
        <Field label={labels.question} htmlFor="question" hint={labels.questionHint}>
          <Textarea
            id="question"
            rows={3}
            maxLength={300}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={disabled}
            required
          />
        </Field>
        <Button type="submit" disabled={disabled || state.status === "loading" || question.trim().length < 5}>
          {state.status === "loading" ? labels.looking : labels.submit}
        </Button>
      </form>

      <section aria-labelledby="examples">
        <h2 id="examples" className="text-lg">
          {labels.examplesHeading}
        </h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {examples.map((example) => (
            <li key={example}>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setQuestion(example)}
                disabled={disabled}
              >
                {example}
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <div aria-live="polite">
        {state.status === "error" && (
          <p role="alert" className="border-destructive bg-muted border-l-4 px-4 py-3 font-semibold">
            {state.message}
          </p>
        )}
        {state.data && (
          <article className="bg-card space-y-4 rounded-lg border p-4">
            <p className="font-heading text-muted-foreground text-[0.78rem] font-bold tracking-[0.12em] uppercase">
              {labels.answerLabel}
            </p>
            <p className="whitespace-pre-line">{state.data.answer}</p>
            {state.data.toolCalls.length > 0 && (
              <details className="border-t pt-3">
                <summary className="cursor-pointer font-semibold">
                  {labels.dataUsed.replace("{count}", String(state.data.toolCalls.length))}
                </summary>
                <ul className="mt-2 space-y-3">
                  {state.data.toolCalls.map((call, index) => (
                    <li key={index}>
                      <p className="font-semibold">{toolLabels(labels)[call.tool] ?? call.tool}</p>
                      <pre className="bg-muted mt-1 overflow-x-auto rounded-md p-2 text-sm">
                        {JSON.stringify(call.output, null, 2)}
                      </pre>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <p className="text-muted-foreground text-sm">{labels.caveat}</p>
          </article>
        )}
      </div>
    </div>
  );
}
