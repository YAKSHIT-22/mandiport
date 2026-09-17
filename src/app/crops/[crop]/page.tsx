import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "drizzle-orm";
import { PricePanel, LedgerTable, Section, td, tdNum, th, CropLink } from "@/components/data/panels";
import { EmptyState, PlainDate, SourceNote } from "@/components/data/meta";
import { TrendChart } from "@/components/data/trend-chart";
import { ExportSummary } from "@/components/data/export-summary";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { CropViewTracker } from "@/components/site/view-tracker";
import { AdSlot } from "@/components/site/ad-slot";
import { LatestBrief } from "@/components/data/latest-brief";
import { getDb } from "@/lib/db";
import { formatDataDate } from "@/lib/dates";
import { formatNumber, formatRupees } from "@/lib/format";
import {
  getCropBySlug,
  getLatestMsp,
  getNationalSeries,
  getRelatedCrops,
  getStatesForCrop,
  getTopMarkets,
  getVarietyPrices,
  headlineFrom,
} from "@/lib/queries/crop";
import { getExportCountries, getExportMapping, getExportYears } from "@/lib/queries/exports";
import { buildPageCopy } from "@/lib/seo/copy";
import { hubIndexable } from "@/lib/seo/indexing";
import { datasetJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 21600;
export const dynamicParams = true;

/** Pre-render Tier 1 hubs only; everything else renders on demand (SPEC §14 Phase 3). */
export async function generateStaticParams() {
  try {
    const rows = await getDb().execute<{ slug: string }>(sql`select slug from commodities where tier = 1`);
    return rows.rows.map((r) => ({ crop: r.slug }));
  } catch {
    return [];
  }
}

type Props = { params: Promise<{ crop: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { crop: slug } = await params;
  const crop = await getCropBySlug(slug);
  if (!crop) return { title: "Crop not found", robots: { index: false } };
  const series = await getNationalSeries(crop.id);
  const latest = series.at(-1);
  const description = latest
    ? `${crop.name} mandi price: ${formatRupees(latest.value)}/quintal on ${formatDataDate(latest.date)} across ${formatNumber(latest.markets)} markets. Trends, top markets, MSP and exports.`
    : `${crop.name} mandi prices, trends, markets and exports from official Government of India data.`;
  return pageMetadata({
    title: `${crop.name} price today in mandis`,
    description,
    path: `/crops/${crop.slug}`,
    index: hubIndexable(crop.tier) && series.length > 0,
  });
}

export default async function CropHubPage({ params }: Props) {
  const { crop: slug } = await params;
  const crop = await getCropBySlug(slug);
  if (!crop) notFound();

  const [series, topMarkets, states, varieties, msp, mapping, related] = await Promise.all([
    getNationalSeries(crop.id),
    getTopMarkets(crop.id, 10),
    getStatesForCrop(crop.id),
    getVarietyPrices(crop.id),
    getLatestMsp(crop.id),
    getExportMapping(crop.id),
    getRelatedCrops(crop),
  ]);
  const headline = headlineFrom(series);
  const exportYears = mapping ? await getExportYears(mapping.exportCommodityId) : [];
  const latestExportYear = exportYears.at(-1);
  const exportCountries =
    mapping && latestExportYear
      ? await getExportCountries(mapping.exportCommodityId, latestExportYear.year, 10)
      : [];

  const lowest = topMarkets.at(-1);
  const highest = topMarkets[0];
  const previousExportYear = exportYears.at(-2);
  const copy = buildPageCopy({
    slug: crop.slug,
    crop: crop.name,
    place: "India",
    latest: headline.latest
      ? { price: headline.latest.value, date: headline.latest.date, markets: headline.latest.markets }
      : undefined,
    weekAgo: headline.weekAgo && { price: headline.weekAgo.value, date: headline.weekAgo.date },
    monthAgo: headline.monthAgo && { price: headline.monthAgo.value, date: headline.monthAgo.date },
    highest: highest && {
      market: `${highest.marketName} (${highest.stateName})`,
      price: highest.modal,
      date: highest.date,
    },
    lowest: lowest && {
      market: `${lowest.marketName} (${lowest.stateName})`,
      price: lowest.modal,
      date: lowest.date,
    },
    msp: msp && { price: msp.price, season: msp.season, year: msp.year },
    exports:
      mapping && latestExportYear
        ? {
            group: mapping.exportName,
            latestYear: latestExportYear.year,
            latestValue: latestExportYear.valueUsdMillion,
            previousYear: previousExportYear?.year,
            previousValue: previousExportYear?.valueUsdMillion,
            topCountry: exportCountries[0]?.country,
            topCountryValue: exportCountries[0]?.valueUsdMillion,
            verified: mapping.status === "verified",
          }
        : null,
  });

  const path = `/crops/${crop.slug}`;
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Crops", path: "/crops" },
    { name: crop.name, path },
  ];
  const datasets = [
    "mandiVariety",
    "mandiDaily",
    ...(msp ? (["msp", "mspRabi"] as const) : []),
    ...(mapping ? (["exports"] as const) : []),
  ] as const;

  return (
    <main className="container-mp space-y-8 py-6">
      <CropViewTracker crop={crop.slug} />
      <Breadcrumbs crumbs={crumbs} />
      <header className="space-y-2">
        <h1>{crop.name} prices</h1>
        {crop.categoryConfirmed && crop.categoryName && (
          <p className="text-muted-foreground">
            <Link href={`/categories/${crop.categorySlug}`} className="underline">
              {crop.categoryName}
            </Link>
          </p>
        )}
      </header>

      <PricePanel
        label="National median modal price"
        headline={headline}
        marketsLabel={
          headline.latest
            ? `${formatNumber(headline.latest.markets)} ${headline.latest.markets === 1 ? "market" : "markets"} reporting`
            : undefined
        }
      />

      {crop.tier === 3 && (
        <EmptyState
          title={`Limited data: ${formatNumber(crop.marketsReporting90d)} ${crop.marketsReporting90d === 1 ? "market" : "markets"} reported in the last 90 days`}
        >
          Figures below may reflect only a few markets and days.
        </EmptyState>
      )}

      <AdSlot position="hub-header" />

      {copy.length > 0 && (
        <div className="prose-mp">
          {copy.map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
        </div>
      )}

      <Section id="trend" title="Price trend">
        <TrendChart
          id={`hub-${crop.slug}`}
          crop={crop.slug}
          points={series}
          label={`${crop.name} national median price`}
          msp={msp?.price}
          mspLabel={msp ? `MSP ${formatRupees(msp.price)} (${msp.year})` : undefined}
        />
        <p className="mt-3">
          <Link href={`/tools/price-history?crop=${crop.slug}`} className="underline">
            Explore price history by market
          </Link>
        </p>
      </Section>

      <Section id="markets" title="Highest recent prices by market">
        {topMarkets.length === 0 ? (
          <EmptyState title="No market reported this crop in the last 30 days" />
        ) : (
          <LedgerTable caption={`${crop.name}: latest modal price by market`}>
            <thead>
              <tr>
                <th className={th}>Market</th>
                <th className={`${th} text-right`}>Modal price (₹/quintal)</th>
                <th className={th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {topMarkets.map((m) => (
                <tr key={`${m.stateSlug}/${m.marketSlug}`}>
                  <td className={td}>
                    <Link href={`${path}/${m.stateSlug}/${m.marketSlug}`} className="font-semibold underline">
                      {m.marketName}
                    </Link>
                    <span className="text-muted-foreground block text-sm">
                      {m.districtName}, {m.stateName}
                    </span>
                  </td>
                  <td className={tdNum}>{formatRupees(m.modal)}</td>
                  <td className={td}>
                    <PlainDate date={m.date} />
                  </td>
                </tr>
              ))}
            </tbody>
          </LedgerTable>
        )}
        <p className="mt-3">
          <Link href={`/tools/best-mandi?crop=${crop.slug}`} className="underline">
            Find the best mandi to sell {crop.name.toLowerCase()} after transport costs
          </Link>
        </p>
      </Section>

      {states.length > 0 && (
        <Section id="states" title="Prices by state">
          <LedgerTable caption={`${crop.name}: median price by state`}>
            <thead>
              <tr>
                <th className={th}>State</th>
                <th className={`${th} text-right`}>Median (₹/quintal)</th>
                <th className={`${th} text-right`}>Markets</th>
                <th className={th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {states.map((s) => (
                <tr key={s.slug}>
                  <td className={td}>
                    <Link href={`${path}/${s.slug}`} className="underline">
                      {s.name}
                    </Link>
                  </td>
                  <td className={tdNum}>{formatRupees(s.median)}</td>
                  <td className={tdNum}>{formatNumber(s.marketsLatest)}</td>
                  <td className={td}>
                    <PlainDate date={s.latestDate} />
                  </td>
                </tr>
              ))}
            </tbody>
          </LedgerTable>
        </Section>
      )}

      {msp && (
        <Section id="msp" title="Minimum support price">
          <p>
            MSP for {msp.name}
            {msp.variety ? ` (${msp.variety})` : ""}, {msp.season === "other" ? "" : `${msp.season} `}
            marketing season {msp.year}: <strong className="figures">{formatRupees(msp.price)}</strong> per
            quintal.
          </p>
          <p className="mt-2">
            <Link href={`/tools/msp-check?crop=${crop.slug}`} className="underline">
              Compare mandi prices with MSP by state
            </Link>
          </p>
        </Section>
      )}

      {varieties.length > 0 && (
        <Section id="varieties" title="Varieties">
          <LedgerTable caption={`${crop.name}: latest median price by variety`}>
            <thead>
              <tr>
                <th className={th}>Variety</th>
                <th className={`${th} text-right`}>Median (₹/quintal)</th>
                <th className={`${th} text-right`}>Markets</th>
                <th className={th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {varieties.map((v) => (
                <tr key={v.name}>
                  <td className={td}>{v.name}</td>
                  <td className={tdNum}>{formatRupees(v.median)}</td>
                  <td className={tdNum}>{formatNumber(v.markets)}</td>
                  <td className={td}>
                    <PlainDate date={v.date} />
                  </td>
                </tr>
              ))}
            </tbody>
          </LedgerTable>
        </Section>
      )}

      {mapping && exportYears.length > 0 && (
        <Section id="exports" title="Exports">
          <ExportSummary
            mapping={mapping}
            years={exportYears}
            countries={exportCountries}
            cropSlug={crop.slug}
          />
        </Section>
      )}

      <Section id="brief" title={crop.tier === 1 ? "Weekly brief" : `Ask about ${crop.name.toLowerCase()}`}>
        <LatestBrief crop={crop} />
      </Section>

      {related.length > 0 && (
        <Section id="related" title="Related crops">
          <ul className="flex flex-wrap gap-x-6">
            {related.map((r) => (
              <li key={r.slug}>
                <CropLink slug={r.slug} name={r.name} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <SourceNote datasets={[...datasets]} />

      {series.length > 0 && (
        <JsonLd
          data={datasetJsonLd({
            name: `${crop.name} mandi prices in India`,
            description: `Daily modal, minimum and maximum wholesale prices of ${crop.name.toLowerCase()} reported by Indian agricultural markets (APMCs), with national and state medians.`,
            path,
            startDate: series[0]!.date,
            endDate: series.at(-1)!.date,
            spatial: "India",
            datasets: ["mandiVariety", "mandiDaily"],
            keywords: [crop.name, "mandi price", "modal price", "Agmarknet"],
          })}
        />
      )}
    </main>
  );
}
