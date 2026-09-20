import type { Metadata } from "next";
import Link from "next/link";
import { getDict } from "@/lib/i18n/dictionary";
import { ToolArt } from "@/components/art/tool-art";
import { EmptyState, SourceNote } from "@/components/data/meta";
import { LedgerTable, td, tdNum, th } from "@/components/data/panels";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Field, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { computeChange, formatNumber, formatPercent, formatUsdMillion } from "@/lib/format";
import { getCropBySlug } from "@/lib/queries/crop";
import { getExportCountries, getExportMapping, getExportYears } from "@/lib/queries/exports";
import { getExportCropOptions } from "@/lib/queries/tools";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 21600;

type Props = { searchParams: Promise<{ crop?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { crop } = await searchParams;
  const name = crop ? (await getCropBySlug(crop))?.name : undefined;
  return pageMetadata({
    title: name ? `Where India exports ${name.toLowerCase()}` : "Export destination finder for Indian crops",
    description: name
      ? `Countries buying Indian ${name.toLowerCase()}, ranked by value, with year-on-year growth from official trade data.`
      : "Find which countries buy an Indian crop, ranked by export value, with growth from official Department of Commerce data.",
    path: "/tools/export-destinations",
  });
}

/** Growth needs a meaningful base, or small numbers dominate the ranking (SPEC §8.5). */
const MIN_VALUE_FOR_GROWTH = 1;

export default async function ExportDestinationsPage({ searchParams }: Props) {
  const t = await getDict();
  const [{ crop: cropSlug }, options] = await Promise.all([searchParams, getExportCropOptions()]);
  const crop = cropSlug ? await getCropBySlug(cropSlug) : null;
  const mapping = crop ? await getExportMapping(crop.id) : null;
  const years = mapping ? await getExportYears(mapping.exportCommodityId) : [];
  const latest = years.at(-1);
  const countries =
    mapping && latest ? await getExportCountries(mapping.exportCommodityId, latest.year, 100) : [];

  const ranked = [...countries].sort((a, b) => b.valueUsdMillion - a.valueUsdMillion);
  const growing = countries
    .filter(
      (c) =>
        c.previousValueUsdMillion !== null &&
        c.previousValueUsdMillion >= MIN_VALUE_FOR_GROWTH &&
        c.valueUsdMillion >= MIN_VALUE_FOR_GROWTH,
    )
    .map((c) => ({ ...c, change: computeChange(c.previousValueUsdMillion!, c.valueUsdMillion)! }))
    .sort((a, b) => b.change.percent - a.change.percent)
    .slice(0, 10);
  const maxValue = ranked[0]?.valueUsdMillion ?? 1;

  return (
    <main className="container-mp space-y-6 py-6">
      <Breadcrumbs
        crumbs={[
          { name: t.chrome.home, path: "/" },
          { name: t.tools.indexTitle, path: "/tools" },
          { name: t.tools.exports.title, path: "/tools/export-destinations" },
        ]}
      />
      <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <h1>{t.tools.exports.title}</h1>
          <p className="prose-mp">{t.tools.exports.intro}</p>
        </div>
        <ToolArt name="export-destinations" className="hidden w-52 self-center sm:block" />
      </div>

      <form className="bg-card flex flex-wrap items-end gap-3 rounded-lg border p-4" method="get">
        <Field label="Crop" htmlFor="crop" className="min-w-56">
          <Select id="crop" name="crop" defaultValue={cropSlug ?? ""}>
            <option value="">Choose a crop</option>
            {options.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name} → {c.exportName}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit">Show destinations</Button>
      </form>

      {!crop ? (
        <EmptyState title="Choose a crop">Only crops mapped to an export group are listed.</EmptyState>
      ) : !mapping || !latest ? (
        <EmptyState title={`No export data is mapped to ${crop.name.toLowerCase()}`}>
          Many crops traded in mandis are sold domestically, or are not reported separately in trade data.{" "}
          <Link href={`/crops/${crop.slug}`} className="underline">
            See {crop.name.toLowerCase()} mandi prices
          </Link>
          .
        </EmptyState>
      ) : (
        <div className="space-y-6">
          <section aria-labelledby="summary">
            <h2 id="summary">
              {crop.name} → {mapping.exportName}, {latest.year}
            </h2>
            <p className="mt-2">
              Total exports of this group:{" "}
              <strong className="figures">{formatUsdMillion(latest.valueUsdMillion)}</strong>
              {latest.quantity !== null && latest.unit
                ? ` (${formatNumber(latest.quantity)} ${latest.unit.toLowerCase()})`
                : ""}
              .
            </p>
            {mapping.status !== "verified" && (
              <p className="border-highlight bg-muted mt-2 border-l-4 px-3 py-2 text-sm">
                <strong>Unverified mapping.</strong> This crop was matched to the group automatically and has
                not been reviewed.
              </p>
            )}
            <p className="text-muted-foreground mt-2 text-sm">
              Annual data with a lag: {latest.year} is the latest year published on data.gov.in, and no
              2020-21 figures are available.
            </p>
          </section>

          {ranked.length === 0 ? (
            <EmptyState title="No destination countries reported for this year" />
          ) : (
            <>
              <section aria-labelledby="top">
                <h2 id="top">Largest buyers</h2>
                <ol className="mt-3 space-y-1">
                  {ranked.slice(0, 15).map((c) => (
                    <li
                      key={c.country}
                      className="grid grid-cols-[minmax(7rem,12rem)_1fr_auto] items-center gap-3 border-b py-2"
                    >
                      <span>{c.country}</span>
                      <span
                        aria-hidden="true"
                        className="bg-primary h-3 rounded-sm"
                        style={{ width: `${Math.max(2, (c.valueUsdMillion / maxValue) * 100)}%` }}
                      />
                      <span className="figures text-right font-semibold">
                        {formatUsdMillion(c.valueUsdMillion)}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>

              {growing.length > 0 && (
                <section aria-labelledby="growing">
                  <h2 id="growing">Fastest-growing markets</h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Countries buying at least US$1 million in both years, ranked by growth.
                  </p>
                  <LedgerTable caption="Fastest-growing destinations" className="mt-3">
                    <thead>
                      <tr>
                        <th className={th}>Country</th>
                        <th className={`${th} text-right`}>{latest.year}</th>
                        <th className={`${th} text-right`}>Previous year</th>
                        <th className={`${th} text-right`}>Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {growing.map((c) => (
                        <tr key={c.country}>
                          <td className={td}>{c.country}</td>
                          <td className={tdNum}>{formatUsdMillion(c.valueUsdMillion)}</td>
                          <td className={tdNum}>{formatUsdMillion(c.previousValueUsdMillion!)}</td>
                          <td
                            className={`${tdNum} ${c.change.direction === "up" ? "text-rise" : "text-fall"}`}
                          >
                            <span aria-hidden="true">{c.change.direction === "up" ? "▲" : "▼"}</span>{" "}
                            {formatPercent(c.change.percent)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </LedgerTable>
                </section>
              )}
            </>
          )}
        </div>
      )}
      <SourceNote datasets={["exports"]} />
    </main>
  );
}
