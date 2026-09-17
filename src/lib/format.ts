/** Number formatting for Indian readers (SPEC §13): ₹1,25,000 grouping, DD MMM YYYY dates. */

const rupeeFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

/** 125000 → "₹1,25,000". Non-finite values → "—". */
export function formatRupees(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const sign = value < 0 ? "−" : "";
  return `${sign}₹${rupeeFormatter.format(Math.abs(Math.round(value)))}`;
}

/** Plain Indian-grouped integer: 125000 → "1,25,000". */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return rupeeFormatter.format(Math.round(value));
}

/** 4.2371 → "4.2%". */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${decimalFormatter.format(Math.abs(value))}%`;
}

/** US$ million with sensible precision: 1234.5 → "US$1,234.5 million", 0.04 → "US$0.04 million". */
export function formatUsdMillion(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const digits = Math.abs(value) >= 10 ? 1 : 2;
  return `US$${new Intl.NumberFormat("en-IN", { maximumFractionDigits: digits }).format(value)} million`;
}

export interface Change {
  from: number;
  to: number;
  absolute: number;
  percent: number;
  direction: "up" | "down" | "flat";
}

/** Change between two prices; null when either is missing or the base is zero. */
export function computeChange(from: number | null | undefined, to: number | null | undefined): Change | null {
  if (from === null || from === undefined || to === null || to === undefined || from <= 0) return null;
  const absolute = to - from;
  const percent = (absolute / from) * 100;
  const direction = Math.abs(percent) < 0.05 ? "flat" : absolute > 0 ? "up" : "down";
  return { from, to, absolute, percent, direction };
}

/** ₹/quintal → ₹/kg and ₹/tonne. 1 quintal = 100 kg; 1 tonne = 10 quintals. */
export const perKg = (perQuintal: number) => perQuintal / 100;
export const perTonne = (perQuintal: number) => perQuintal * 10;
