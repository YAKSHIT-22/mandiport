import type { Metadata } from "next";
import Link from "next/link";
import { getDict } from "@/lib/i18n/dictionary";
import { ToolArt } from "@/components/art/tool-art";
import { EmptyState, PlainDate, SourceNote } from "@/components/data/meta";
import { LedgerTable, td, tdNum, th } from "@/components/data/panels";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Field, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { computeChange, formatNumber, formatPercent, formatRupees } from "@/lib/format";
import { getCropBySlug, getLatestMsp } from "@/lib/queries/crop";
import { getCropOptions, getMspComparison } from "@/lib/queries/tools";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 21600;

type Props = { searchParams: Promise<{ crop?: string; state?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { crop } = await searchParams;
  const name = crop ? (await getCropBySlug(crop))?.name : undefined;
  return pageMetadata({
    title: name ? `${name} price vs MSP by state` : "MSP check: mandi price vs support price",
    description: name
      ? `Compare ${name.toLowerCase()} mandi prices in each state with the minimum support price, with the date of both figures.`
      : "Compare mandi prices with the government's minimum support price, state by state, with the date of both figures.",
    path: "/tools/msp-check",
  });
}

export default async function MspCheckPage({ searchParams }: Props) {
  const t = await getDict();
  const [{ crop: cropSlug, state: stateSlug }, crops] = await Promise.all([searchParams, getCropOptions()]);
  const crop = cropSlug ? await getCropBySlug(cropSlug) : null;
  const [msp, comparison] = crop
    ? await Promise.all([getLatestMsp(crop.id), getMspComparison(crop.slug)])
    : [null, []];
  const rows = stateSlug ? comparison.filter((c) => c.stateSlug === stateSlug) : comparison;

  return (
    <main className="container-mp space-y-6 py-6">
      <Breadcrumbs
        crumbs={[
          { name: t.chrome.home, path: "/" },
          { name: t.tools.indexTitle, path: "/tools" },
          { name: t.tools.msp.title, path: "/tools/msp-check" },
        ]}
      />
      <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <h1>{t.tools.msp.title}</h1>
          <p className="prose-mp">{t.tools.msp.intro}</p>
        </div>
        <ToolArt name="msp-check" className="hidden w-52 self-center sm:block" />
      </div>

      <form className="bg-card flex flex-wrap items-end gap-3 rounded-lg border p-4" method="get">
        <Field label="Crop" htmlFor="crop" className="min-w-56">
          <Select id="crop" name="crop" defaultValue={cropSlug ?? ""}>
            <option value="">Choose a crop</option>
            {crops.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit">Compare with MSP</Button>
      </form>

      {!crop ? (
        <EmptyState title="Choose a crop to compare">
          Crops with an MSP include wheat, paddy, gram, mustard and cotton.
        </EmptyState>
      ) : !msp ? (
        <EmptyState title={`No MSP is published for ${crop.name.toLowerCase()}`}>
          MSP is announced for 22 mandated crops plus copra and jute.{" "}
          <Link href={`/crops/${crop.slug}`} className="underline">
            See {crop.name.toLowerCase()} market prices
          </Link>
          .
        </EmptyState>
      ) : (
        <section aria-labelledby="comparison" className="space-y-4">
          <h2 id="comparison">
            {crop.name}: MSP {formatRupees(msp.price)} per quintal
          </h2>
          <p className="text-muted-foreground">
            {msp.season === "other" ? "" : `${msp.season} `}marketing season {msp.year}
            {msp.variety ? ` · variety ${msp.variety}` : ""}
          </p>
          {rows.length === 0 ? (
            <EmptyState title="No state reported this crop in the last 45 days" />
          ) : (
            <LedgerTable caption={`${crop.name}: state median price against MSP`}>
              <thead>
                <tr>
                  <th className={th}>State</th>
                  <th className={`${th} text-right`}>Median (₹/quintal)</th>
                  <th className={`${th} text-right`}>Against MSP</th>
                  <th className={`${th} text-right`}>Markets</th>
                  <th className={th}>Price date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const change = computeChange(msp.price, r.median);
                  return (
                    <tr key={r.stateSlug}>
                      <td className={td}>
                        <Link href={`/crops/${crop.slug}/${r.stateSlug}`} className="underline">
                          {r.stateName}
                        </Link>
                      </td>
                      <td className={tdNum}>{formatRupees(r.median)}</td>
                      <td
                        className={`${tdNum} ${change?.direction === "up" ? "text-rise" : change?.direction === "down" ? "text-fall" : ""}`}
                      >
                        {change ? (
                          <>
                            <span aria-hidden="true">
                              {change.direction === "up" ? "▲" : change.direction === "down" ? "▼" : "–"}
                            </span>{" "}
                            {formatPercent(change.percent)}{" "}
                            {change.direction === "up"
                              ? "above"
                              : change.direction === "down"
                                ? "below"
                                : "at"}{" "}
                            MSP
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className={tdNum}>{formatNumber(r.markets)}</td>
                      <td className={td}>
                        <PlainDate date={r.date} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </LedgerTable>
          )}
          <p className="text-muted-foreground text-sm">
            MSP applies to procurement of fair average quality produce at designated centres. Being below MSP
            in a mandi does not mean procurement is unavailable.
          </p>
        </section>
      )}
      <SourceNote datasets={["mandiVariety", "msp", "mspRabi"]} />
    </main>
  );
}
