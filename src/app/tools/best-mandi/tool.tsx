"use client";

import Link from "next/link";
import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { formatDataDate } from "@/lib/dates";
import { formatNumber, formatRupees } from "@/lib/format";
import type { CropOption } from "@/lib/queries/tools";
import type { RankedMandi } from "@/lib/tools/best-mandi";

type Result = RankedMandi & { straightLineOnly?: boolean };

interface Response {
  results?: Result[];
  originLabel?: string | null;
  note?: string | null;
  distancesAvailable?: boolean;
  marketsConsidered?: number;
  error?: string;
}

export function BestMandiTool({
  crops,
  initialCrop,
  mapsConfigured,
}: {
  crops: CropOption[];
  initialCrop?: string;
  mapsConfigured: boolean;
}) {
  const [crop, setCrop] = useState(initialCrop ?? crops[0]?.slug ?? "");
  const [place, setPlace] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [quantity, setQuantity] = useState("20");
  const [rate, setRate] = useState("3");
  const [maxDistance, setMaxDistance] = useState("150");
  const [state, setState] = useState<{
    status: "idle" | "loading" | "done" | "error";
    data?: Response;
    message?: string;
  }>({ status: "idle" });

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setState({
        status: "error",
        message: "This browser cannot share your location. Enter a pincode instead.",
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setPlace("");
      },
      () =>
        setState({
          status: "error",
          message: "Location permission was declined. Enter a pincode or town instead.",
        }),
      { timeout: 10_000 },
    );
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/best-mandi", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          crop,
          place: place || undefined,
          ...(coords ?? {}),
          quantity,
          rate,
          maxDistance,
        }),
      });
      const data = (await response.json()) as Response;
      if (!response.ok) {
        setState({ status: "error", message: data.error ?? "Something went wrong. Try again." });
        return;
      }
      setState({ status: "done", data });
      track("tool_used", { tool: "best-mandi", crop });
      track("best_mandi_result", {
        crop,
        results_count: data.results?.length ?? 0,
        max_distance_km: Number(maxDistance),
      });
    } catch {
      setState({ status: "error", message: "The request failed. Check your connection and try again." });
    }
  }

  const results = state.status === "done" ? (state.data?.results ?? []) : [];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <form onSubmit={submit} className="bg-card space-y-4 rounded-lg border p-4">
        <Field label="Crop" htmlFor="crop">
          <Select id="crop" value={crop} onChange={(e) => setCrop(e.target.value)} required>
            {crops.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Your place"
          htmlFor="place"
          hint={coords ? "Using your device location." : "Pincode or town, for example 422202 or Nashik."}
        >
          <Input
            id="place"
            value={place}
            onChange={(e) => {
              setPlace(e.target.value);
              setCoords(null);
            }}
            placeholder="Pincode or town"
            autoComplete="postal-code"
          />
        </Field>
        <Button type="button" variant="outline" onClick={useMyLocation}>
          <LocateFixed /> Use my location
        </Button>
        <Field label="Quantity (quintals)" htmlFor="quantity">
          <Input
            id="quantity"
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </Field>
        <Field
          label="Transport cost (₹ per km per quintal)"
          htmlFor="rate"
          hint="Your own estimate, including loading and return."
        >
          <Input
            id="rate"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            required
          />
        </Field>
        <Field label="Maximum distance (km)" htmlFor="maxDistance">
          <Input
            id="maxDistance"
            inputMode="numeric"
            value={maxDistance}
            onChange={(e) => setMaxDistance(e.target.value)}
            required
          />
        </Field>
        <Button type="submit" size="lg" disabled={state.status === "loading" || !crop}>
          {state.status === "loading" ? "Finding…" : "Find best mandi"}
        </Button>
        {!mapsConfigured && (
          <p className="text-muted-foreground text-sm">
            Distance lookups are not configured on this site yet, so results are ranked by price alone.
          </p>
        )}
      </form>

      <div aria-live="polite">
        {state.status === "error" && (
          <p role="alert" className="border-destructive bg-muted border-l-4 px-4 py-3 font-semibold">
            {state.message}
          </p>
        )}
        {state.status === "idle" && (
          <p className="border-border bg-muted border-l-4 px-4 py-3">
            Choose a crop and enter your place, then press “Find best mandi”.
          </p>
        )}
        {state.status === "done" && results.length === 0 && (
          <p className="border-border bg-muted border-l-4 px-4 py-3">
            {state.data?.note ??
              "No market reported this crop within your distance limit in the last 7 days."}{" "}
            Try a larger distance.
          </p>
        )}
        {results.length > 0 && (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              {state.data?.originLabel ? `From ${state.data.originLabel}. ` : ""}
              {state.data?.marketsConsidered
                ? `${formatNumber(state.data.marketsConsidered)} markets considered. `
                : ""}
              {state.data?.note ?? ""}
            </p>
            <ol className="space-y-3">
              {results.map((r, index) => (
                <li key={r.marketId} className="bg-card rounded-lg border p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-lg">
                      <span className="text-muted-foreground mr-2">{index + 1}.</span>
                      <Link
                        href={`/crops/${r.cropSlug}/${r.stateSlug}/${r.marketSlug}`}
                        className="underline"
                      >
                        {r.marketName}
                      </Link>
                    </h2>
                    <p className="figures text-price-lg font-bold">{formatRupees(r.netValue)}</p>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {r.district}, {r.stateName}
                  </p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                    <div>
                      <dt className="text-muted-foreground">Price</dt>
                      <dd className="figures font-semibold">{formatRupees(r.modalPrice)}/qtl</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Price date</dt>
                      <dd>{formatDataDate(r.date)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Distance</dt>
                      <dd className="figures">
                        {r.distanceKm === null ? "unknown" : `${formatNumber(r.distanceKm)} km`}
                        {r.straightLineOnly && r.distanceKm !== null ? " (straight line)" : ""}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Transport</dt>
                      <dd className="figures">−{formatRupees(r.transportCost)}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ol>
            <p className="text-muted-foreground text-sm">
              Estimated take-home = price × quantity − distance × your transport rate × quantity. Prices are
              as last reported and may have changed. Check quality requirements and mandi fees before you
              travel.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
