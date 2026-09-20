import { formatDataDate } from "@/lib/dates";
import type { Dictionary } from "@/content/i18n/en";
import { formatNumber, formatRupees } from "@/lib/format";
import type { MonthlyAverage } from "@/lib/queries/crop";
import { computeSeasonality, MONTH_NAMES } from "@/lib/seasonality";
import { LedgerTable, td, tdNum, th } from "./panels";
import { EmptyState } from "./meta";

/** Monthly averages and, after 12 months of data, historically highest months (SPEC §8.3). */
export type SeasonalityLabels = Dictionary["chart"] & { emptyTitle: string; emptyBody: string };

export function SeasonalityBlock({
  monthly,
  firstDate,
  place,
  labels,
  locale,
}: {
  monthly: MonthlyAverage[];
  firstDate: string | null;
  place: string;
  labels: SeasonalityLabels;
  locale: string;
}) {
  const fill = (template: string, values: Record<string, string | number>) =>
    template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
  const seasonality = computeSeasonality(monthly);
  return (
    <div className="space-y-4">
      {seasonality ? (
        <p>
          {fill(labels.seasonalityLine, { place })}{" "}
          <strong>
            {seasonality.highest.map((h) => `${h.name} (${formatRupees(h.average)})`).join(", ")}
          </strong>
          . {labels.seasonalityCaveat}
        </p>
      ) : (
        <EmptyState title={labels.emptyTitle}>
          {firstDate
            ? fill(labels.collectionStarted, { date: formatDataDate(firstDate, locale) })
            : labels.emptyBody}
        </EmptyState>
      )}
      {monthly.length > 0 && (
        <LedgerTable caption={fill(labels.monthlyCaption, { place })}>
          <thead>
            <tr>
              <th className={th}>{labels.month}</th>
              <th className={`${th} text-right`}>{labels.average}</th>
              <th className={`${th} text-right`}>{labels.low}</th>
              <th className={`${th} text-right`}>{labels.high}</th>
              <th className={`${th} text-right`}>{labels.daysColumn}</th>
            </tr>
          </thead>
          <tbody>
            {[...monthly].reverse().map((m) => (
              <tr key={m.month}>
                <td className={td}>
                  {MONTH_NAMES[Number(m.month.slice(5, 7)) - 1]} {m.month.slice(0, 4)}
                </td>
                <td className={tdNum}>{formatRupees(m.avg)}</td>
                <td className={tdNum}>{formatRupees(m.min)}</td>
                <td className={tdNum}>{formatRupees(m.max)}</td>
                <td className={tdNum}>{formatNumber(m.days)}</td>
              </tr>
            ))}
          </tbody>
        </LedgerTable>
      )}
    </div>
  );
}
