import type { MonthlyAverage } from "@/lib/queries/crop";

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export interface Seasonality {
  months: { month: number; name: string; average: number; years: number }[];
  highest: { month: number; name: string; average: number }[];
}

/**
 * "Historically highest average months" (SPEC §8.3). Only when at least 12 distinct months of
 * data exist; otherwise null. Averages each calendar month across the years we hold.
 * Describes the past only; never a forecast.
 */
export function computeSeasonality(monthly: MonthlyAverage[], minMonths = 12, top = 3): Seasonality | null {
  const distinct = new Set(monthly.map((m) => m.month.slice(0, 7)));
  if (distinct.size < minMonths) return null;
  const byMonth = new Map<number, number[]>();
  for (const m of monthly) {
    const monthIndex = Number(m.month.slice(5, 7)) - 1;
    byMonth.set(monthIndex, [...(byMonth.get(monthIndex) ?? []), m.avg]);
  }
  const months = [...byMonth.entries()]
    .map(([month, values]) => ({
      month,
      name: MONTH_NAMES[month]!,
      average: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      years: values.length,
    }))
    .sort((a, b) => a.month - b.month);
  const highest = [...months]
    .sort((a, b) => b.average - a.average || a.month - b.month)
    .slice(0, top)
    .map(({ month, name, average }) => ({ month, name, average }));
  return { months, highest };
}
