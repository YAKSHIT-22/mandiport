import { formatDataDate } from "@/lib/dates";
import { formatNumber, formatRupees } from "@/lib/format";
import type { MonthlyAverage } from "@/lib/queries/crop";
import { computeSeasonality, MONTH_NAMES } from "@/lib/seasonality";
import { LedgerTable, td, tdNum, th } from "./panels";
import { EmptyState } from "./meta";

/** Monthly averages and, after 12 months of data, historically highest months (SPEC §8.3). */
export function SeasonalityBlock({
  monthly,
  firstDate,
  place,
}: {
  monthly: MonthlyAverage[];
  firstDate: string | null;
  place: string;
}) {
  const seasonality = computeSeasonality(monthly);
  return (
    <div className="space-y-4">
      {seasonality ? (
        <p>
          Historically highest average months at {place}:{" "}
          <strong>
            {seasonality.highest.map((h) => `${h.name} (${formatRupees(h.average)})`).join(", ")}
          </strong>
          . These are past averages, not a forecast; prices in any year can differ.
        </p>
      ) : (
        <EmptyState title="Seasonality appears after 12 months of data">
          {firstDate
            ? `Data collection started on ${formatDataDate(firstDate)}.`
            : "No data has been collected yet."}
        </EmptyState>
      )}
      {monthly.length > 0 && (
        <LedgerTable caption={`Monthly average modal price at ${place}`}>
          <thead>
            <tr>
              <th className={th}>Month</th>
              <th className={`${th} text-right`}>Average (₹/quintal)</th>
              <th className={`${th} text-right`}>Low</th>
              <th className={`${th} text-right`}>High</th>
              <th className={`${th} text-right`}>Days</th>
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
