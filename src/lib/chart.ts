import { formatDataDate } from "./dates";
import { formatRupees } from "./format";

/** Geometry for server-rendered SVG trend charts. Pure and unit-tested. */

export interface SeriesPoint {
  date: string; // YYYY-MM-DD
  value: number;
  min?: number | null;
  max?: number | null;
}

export interface ChartGeometry {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
  linePaths: string[];
  bandPaths: string[];
  yTicks: { value: number; y: number; label: string }[];
  xTicks: { date: string; x: number; label: string }[];
  mspY: number | null;
  domain: { min: number; max: number };
  lastPoint: { x: number; y: number } | null;
}

const DAY = 86_400_000;
const toTime = (date: string) => Date.parse(`${date}T00:00:00Z`);

/** "Nice" tick step for a range: 1, 2, 2.5 or 5 × 10^n. */
export function niceStep(range: number, targetTicks = 4): number {
  if (range <= 0) return 1;
  const rough = range / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / magnitude;
  const nice = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 2.5 ? 2.5 : residual <= 5 ? 5 : 10;
  return nice * magnitude;
}

/** Splits a series where consecutive dates are more than `maxGapDays` apart, so gaps are not drawn as data. */
export function splitOnGaps<T extends { date: string }>(points: T[], maxGapDays = 7): T[][] {
  const segments: T[][] = [];
  let current: T[] = [];
  for (const point of points) {
    const previous = current.at(-1);
    if (previous && toTime(point.date) - toTime(previous.date) > maxGapDays * DAY) {
      segments.push(current);
      current = [];
    }
    current.push(point);
  }
  if (current.length > 0) segments.push(current);
  return segments;
}

export function buildChartGeometry(
  points: SeriesPoint[],
  options: {
    width?: number;
    height?: number;
    msp?: number | null;
    startDate?: string;
    endDate?: string;
  } = {},
): ChartGeometry | null {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return null;
  const width = options.width ?? 720;
  const height = options.height ?? 280;
  const padding = { top: 16, right: 16, bottom: 32, left: 72 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const values = sorted.flatMap((p) => [p.value, p.min ?? p.value, p.max ?? p.value]);
  if (options.msp) values.push(options.msp);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (lo === hi) {
    lo = lo * 0.9;
    hi = hi * 1.1 || 1;
  }
  const step = niceStep(hi - lo);
  const domainMin = Math.max(0, Math.floor(lo / step) * step);
  const domainMax = Math.ceil(hi / step) * step;

  const t0 = toTime(options.startDate ?? sorted[0]!.date);
  const t1 = Math.max(toTime(options.endDate ?? sorted.at(-1)!.date), t0 + DAY);
  const x = (date: string) => padding.left + ((toTime(date) - t0) / (t1 - t0)) * plotW;
  const y = (v: number) => padding.top + (1 - (v - domainMin) / (domainMax - domainMin)) * plotH;
  const r = (n: number) => Math.round(n * 10) / 10;

  const segments = splitOnGaps(sorted);
  const linePaths = segments.map((seg) =>
    seg.map((p, i) => `${i === 0 ? "M" : "L"}${r(x(p.date))},${r(y(p.value))}`).join(""),
  );
  const bandPaths = segments
    .filter((seg) => seg.every((p) => p.min != null && p.max != null) && seg.length > 1)
    .map((seg) => {
      const top = seg.map((p, i) => `${i === 0 ? "M" : "L"}${r(x(p.date))},${r(y(p.max!))}`).join("");
      const bottom = [...seg]
        .reverse()
        .map((p) => `L${r(x(p.date))},${r(y(p.min!))}`)
        .join("");
      return `${top}${bottom}Z`;
    });

  const yTicks = [];
  for (let v = domainMin; v <= domainMax + step / 2; v += step) {
    yTicks.push({ value: v, y: r(y(v)), label: formatRupees(v) });
  }

  const xTicks = [];
  const tickCount = 4;
  for (let i = 0; i <= tickCount; i++) {
    const t = t0 + ((t1 - t0) * i) / tickCount;
    const date = new Date(t).toISOString().slice(0, 10);
    xTicks.push({ date, x: r(x(date)), label: formatDataDate(date).slice(0, 6) });
  }

  const last = sorted.at(-1)!;
  return {
    width,
    height,
    padding,
    linePaths,
    bandPaths,
    yTicks,
    xTicks,
    mspY: options.msp ? r(y(options.msp)) : null,
    domain: { min: domainMin, max: domainMax },
    lastPoint: { x: r(x(last.date)), y: r(y(last.value)) },
  };
}

/** Screen-reader and no-chart summary (SPEC §13). */
export function summarizeSeries(points: SeriesPoint[], label: string): string {
  if (points.length === 0) return `No ${label} data in this period.`;
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0]!;
  const last = sorted.at(-1)!;
  const low = sorted.reduce((a, b) => (b.value < a.value ? b : a));
  const high = sorted.reduce((a, b) => (b.value > a.value ? b : a));
  return (
    `${label} from ${formatDataDate(first.date)} to ${formatDataDate(last.date)} (${sorted.length} days with data): ` +
    `lowest ${formatRupees(low.value)} on ${formatDataDate(low.date)}, highest ${formatRupees(high.value)} on ${formatDataDate(high.date)}, ` +
    `latest ${formatRupees(last.value)} on ${formatDataDate(last.date)}.`
  );
}
