"use client";

import { useEffect, useState } from "react";
import { TrendChart } from "@/components/data/trend-chart";
import { SeasonalityBlock } from "@/components/data/seasonality-table";
import { Field, Select } from "@/components/ui/field";
import { track } from "@/lib/analytics";
import type { MonthlyAverage, PricePoint } from "@/lib/queries/crop";
import type { CropOption, MarketOption, StateOption } from "@/lib/queries/tools";

interface HistoryResponse {
  crop: { slug: string; name: string };
  place: string;
  series: PricePoint[];
  monthly: MonthlyAverage[];
  firstDate: string | null;
  error?: string;
}

export function PriceHistoryTool({
  crops,
  initial,
}: {
  crops: CropOption[];
  initial: { crop?: string; state?: string; market?: string };
}) {
  const [crop, setCrop] = useState(initial.crop ?? crops[0]?.slug ?? "");
  const [state, setState] = useState(initial.state ?? "");
  const [market, setMarket] = useState(initial.market ?? "");
  const [states, setStates] = useState<StateOption[]>([]);
  const [markets, setMarkets] = useState<MarketOption[]>([]);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");

  // One effect per dependency set; all state updates happen after an await, never synchronously,
  // so React is not asked to re-render in a loop.
  useEffect(() => {
    if (!crop) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/tool-options?crop=${crop}`);
        const data = (await response.json()) as { states: StateOption[] };
        if (!cancelled) setStates(data.states);
      } catch {
        if (!cancelled) setStates([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [crop]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!crop || !state) {
        await Promise.resolve();
        if (!cancelled) setMarkets([]);
        return;
      }
      try {
        const response = await fetch(`/api/tool-options?crop=${crop}&state=${state}`);
        const data = (await response.json()) as { markets: MarketOption[] };
        if (!cancelled) setMarkets(data.markets);
      } catch {
        if (!cancelled) setMarkets([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [crop, state]);

  useEffect(() => {
    if (!crop) return;
    let cancelled = false;
    const params = new URLSearchParams({ crop });
    if (state) params.set("state", state);
    if (state && market) params.set("market", market);
    void (async () => {
      await Promise.resolve();
      if (!cancelled) setStatus("loading");
      try {
        const response = await fetch(`/api/price-history?${params.toString()}`);
        const body = (await response.json()) as HistoryResponse;
        if (!response.ok) throw new Error(body.error ?? "failed");
        if (cancelled) return;
        setData(body);
        setStatus("idle");
        track("tool_used", { tool: "price-history", crop, state: state || undefined });
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [crop, state, market]);

  return (
    <div className="space-y-6">
      <form
        className="bg-card grid gap-4 rounded-lg border p-4 sm:grid-cols-3"
        onSubmit={(e) => e.preventDefault()}
      >
        <Field label="Crop" htmlFor="ph-crop">
          <Select
            id="ph-crop"
            value={crop}
            onChange={(e) => {
              setCrop(e.target.value);
              setState("");
              setMarket("");
            }}
          >
            {crops.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="State" htmlFor="ph-state">
          <Select
            id="ph-state"
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              setMarket("");
            }}
          >
            <option value="">All India</option>
            {states.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Market" htmlFor="ph-market">
          <Select id="ph-market" value={market} onChange={(e) => setMarket(e.target.value)} disabled={!state}>
            <option value="">All markets in the state</option>
            {markets.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.name} ({m.district})
              </option>
            ))}
          </Select>
        </Field>
      </form>

      <div aria-live="polite">
        {status === "error" && (
          <p role="alert" className="border-destructive bg-muted border-l-4 px-4 py-3 font-semibold">
            Could not load this price history. Try another crop or reload the page.
          </p>
        )}
        {status === "loading" && (
          <p className="border-border bg-muted border-l-4 px-4 py-3">Loading prices…</p>
        )}
        {status === "idle" && data && (
          <div className="space-y-8">
            <section aria-labelledby="ph-trend">
              <h2 id="ph-trend">
                {data.crop.name} in {data.place}
              </h2>
              <div className="mt-4">
                <TrendChart
                  id="price-history"
                  crop={data.crop.slug}
                  points={data.series}
                  label={`${data.crop.name} price in ${data.place}`}
                />
              </div>
            </section>
            {market && (
              <section aria-labelledby="ph-months">
                <h2 id="ph-months">Monthly averages</h2>
                <div className="mt-4">
                  <SeasonalityBlock monthly={data.monthly} firstDate={data.firstDate} place={data.place} />
                </div>
              </section>
            )}
            {!market && (
              <p className="border-border bg-muted border-l-4 px-4 py-3">
                Choose a state and market to see monthly averages and the historically highest months.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
