import Link from "next/link";
import { computeChange, formatNumber, formatPercent, formatUsdMillion } from "@/lib/format";
import type { CountryExport, ExportMapping, ExportYear } from "@/lib/queries/exports";
import { LedgerTable, td, tdNum, th } from "./panels";

function quantityLabel(quantity: number | null, unit: string | null) {
  if (quantity === null || !unit) return null;
  return `${formatNumber(quantity)} ${unit.toLowerCase()}`;
}

export function ExportSummary({
  mapping,
  years,
  countries,
  cropSlug,
}: {
  mapping: ExportMapping;
  years: ExportYear[];
  countries: CountryExport[];
  cropSlug: string;
}) {
  const latest = years.at(-1)!;
  const recent = years.slice(-5);
  const qty = quantityLabel(latest.quantity, latest.unit);
  return (
    <div className="space-y-4">
      <p>
        Official export figures are published for the group <strong>{mapping.exportName}</strong>, not for
        each crop separately. In {latest.year} India exported{" "}
        <strong className="figures">{formatUsdMillion(latest.valueUsdMillion)}</strong>
        {qty ? ` (${qty})` : ""} of this group.
      </p>
      {mapping.status !== "verified" && (
        <p className="border-highlight bg-muted border-l-4 px-3 py-2 text-sm">
          <strong>Unverified mapping.</strong> This crop was matched to the export group automatically and has
          not been reviewed yet.
        </p>
      )}
      <p className="text-muted-foreground text-sm">
        Data lag: annual financial-year figures; the latest year available on data.gov.in is {latest.year}. No
        figures are published for 2020-21.
      </p>
      {recent.length > 1 && (
        <LedgerTable caption={`${mapping.exportName}: export value by year`}>
          <thead>
            <tr>
              <th className={th}>Year</th>
              <th className={`${th} text-right`}>Value (US$ million)</th>
              <th className={`${th} text-right`}>Change</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((y, i) => {
              const prev = i > 0 ? recent[i - 1] : years[years.length - recent.length - 1];
              const c = prev ? computeChange(prev.valueUsdMillion, y.valueUsdMillion) : null;
              return (
                <tr key={y.year}>
                  <td className={td}>{y.year}</td>
                  <td className={tdNum}>{formatNumber(y.valueUsdMillion)}</td>
                  <td
                    className={`${tdNum} ${c?.direction === "up" ? "text-rise" : c?.direction === "down" ? "text-fall" : ""}`}
                  >
                    {c
                      ? `${c.direction === "up" ? "▲" : c.direction === "down" ? "▼" : "–"} ${formatPercent(c.percent)}`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </LedgerTable>
      )}
      {countries.length > 0 && (
        <>
          <h3>Top destinations in {latest.year}</h3>
          <LedgerTable caption={`${mapping.exportName}: top destination countries in ${latest.year}`}>
            <thead>
              <tr>
                <th className={th}>Country</th>
                <th className={`${th} text-right`}>Value (US$ million)</th>
              </tr>
            </thead>
            <tbody>
              {countries.map((c) => (
                <tr key={c.country}>
                  <td className={td}>{c.country}</td>
                  <td className={tdNum}>
                    {c.valueUsdMillion.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </LedgerTable>
        </>
      )}
      <p>
        <Link href={`/tools/export-destinations?crop=${cropSlug}`} className="underline">
          See all destinations and fastest-growing markets
        </Link>
      </p>
    </div>
  );
}
