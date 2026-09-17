import { buildChartGeometry, summarizeSeries, type SeriesPoint } from "@/lib/chart";
import { formatRupees } from "@/lib/format";
import { daysBefore } from "@/lib/dates";
import { ChartPeriodTracker } from "./chart-period-tracker";
import { EmptyState } from "./meta";

const PERIODS = [30, 90, 365] as const;

/**
 * Server-rendered SVG trend with a min–max band and optional MSP line. Period tabs are radio
 * inputs switched with CSS (:has), so they work without JavaScript (DESIGN.md).
 */
export function TrendChart({
  id,
  points,
  label,
  msp,
  mspLabel,
  crop,
  defaultPeriod = 90,
}: {
  id: string;
  points: SeriesPoint[];
  label: string;
  msp?: number | null;
  mspLabel?: string;
  crop: string;
  defaultPeriod?: 30 | 90 | 365;
}) {
  if (points.length === 0) {
    return (
      <EmptyState title="No price history yet">Prices appear here once markets report this crop.</EmptyState>
    );
  }
  const latest = [...points].sort((a, b) => a.date.localeCompare(b.date)).at(-1)!.date;
  const earliest = [...points].sort((a, b) => a.date.localeCompare(b.date))[0]!.date;
  // Offer longer periods only when data reaches back that far.
  const available = PERIODS.filter((p, i) => i === 0 || daysBefore(latest, PERIODS[i - 1]!) >= earliest);
  const initial = available.includes(defaultPeriod) ? defaultPeriod : available.at(-1)!;

  return (
    <div className="chart-tabs" data-chart={id}>
      <fieldset className="mb-3 flex flex-wrap items-center gap-2">
        <legend className="sr-only">Chart period</legend>
        {available.map((p) => (
          <label key={p} className="relative">
            <input
              type="radio"
              name={`${id}-period`}
              value={p}
              defaultChecked={p === initial}
              className="peer absolute inset-0 opacity-0"
              data-period-input={p}
            />
            <span className="figures border-input peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:outline-ring inline-flex min-h-11 min-w-16 cursor-pointer items-center justify-center rounded-sm border px-3 font-semibold peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2">
              {p} days
            </span>
          </label>
        ))}
      </fieldset>
      <ChartPeriodTracker chartId={id} crop={crop} />
      {available.map((p) => {
        const start = daysBefore(latest, p - 1);
        const series = points.filter((pt) => pt.date >= start);
        const geometry = buildChartGeometry(series, { msp, startDate: start, endDate: latest });
        return (
          <figure key={p} data-period={p} className="chart-panel">
            {geometry && (
              <svg
                viewBox={`0 0 ${geometry.width} ${geometry.height}`}
                className="h-auto w-full"
                role="img"
                aria-label={`${label}, last ${p} days`}
              >
                {geometry.yTicks.map((t) => (
                  <g key={t.value}>
                    <line
                      x1={geometry.padding.left}
                      x2={geometry.width - geometry.padding.right}
                      y1={t.y}
                      y2={t.y}
                      stroke="var(--border)"
                    />
                    <text
                      x={geometry.padding.left - 8}
                      y={t.y + 5}
                      textAnchor="end"
                      className="figures fill-muted-foreground text-[13px]"
                    >
                      {t.label}
                    </text>
                  </g>
                ))}
                {geometry.xTicks.map((t, i) => (
                  <text
                    key={t.date}
                    x={t.x}
                    y={geometry.height - 8}
                    textAnchor={i === 0 ? "start" : i === geometry.xTicks.length - 1 ? "end" : "middle"}
                    className="fill-muted-foreground text-[13px]"
                  >
                    {t.label}
                  </text>
                ))}
                {geometry.bandPaths.map((d, i) => (
                  <path key={`b${i}`} d={d} fill="var(--chart-band)" fillOpacity={0.16} />
                ))}
                {geometry.mspY !== null && (
                  <g>
                    <line
                      x1={geometry.padding.left}
                      x2={geometry.width - geometry.padding.right}
                      y1={geometry.mspY}
                      y2={geometry.mspY}
                      stroke="var(--highlight)"
                      strokeWidth={2}
                      strokeDasharray="8 6"
                    />
                    <text
                      x={geometry.width - geometry.padding.right}
                      y={geometry.mspY - 6}
                      textAnchor="end"
                      className="fill-foreground text-[13px] font-semibold"
                    >
                      {mspLabel ?? `MSP ${formatRupees(msp)}`}
                    </text>
                  </g>
                )}
                {geometry.linePaths.map((d, i) => (
                  <path
                    key={`l${i}`}
                    d={d}
                    fill="none"
                    stroke="var(--chart-1)"
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ))}
                {geometry.lastPoint && (
                  <circle cx={geometry.lastPoint.x} cy={geometry.lastPoint.y} r={4} fill="var(--chart-1)" />
                )}
              </svg>
            )}
            <figcaption className="text-muted-foreground mt-2 text-sm">
              {summarizeSeries(series, label)} Shaded band: lowest to highest market price reported.
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
