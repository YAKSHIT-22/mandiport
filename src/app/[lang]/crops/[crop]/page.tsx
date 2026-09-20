import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "drizzle-orm";
import { CategoryArt } from "@/components/art/category-art";
import { format, getDict, getLocale } from "@/lib/i18n/dictionary";
import { categoryName, cropName } from "@/lib/i18n/names";
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
  const t = await getDict();
  const locale = await getLocale();
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
  const name = cropName(crop.slug, crop.name, locale);
  const crumbs = [
    { name: t.chrome.home, path: "/" },
    { name: t.nav.crops, path: "/crops" },
    { name, path },
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
      <header className="flex items-center gap-4">
        {crop.categoryConfirmed && crop.categorySlug && (
          <span className="bg-accent flex size-14 shrink-0 items-center justify-center rounded-lg border">
            <CategoryArt slug={crop.categorySlug} className="size-10" />
          </span>
        )}
        <div className="space-y-2">
          <h1>{format(t.crop.titleSuffix, { crop: name })}</h1>
          {crop.categoryConfirmed && crop.categoryName && (
            <p className="text-muted-foreground">
              <Link href={`/categories/${crop.categorySlug}`} className="underline">
                {categoryName(crop.categorySlug ?? "", crop.categoryName, locale)}
              </Link>
            </p>
          )}
        </div>
      </header>

      <PricePanel
        label={t.crop.nationalMedian}
        headline={headline}
        marketsLabel={
          headline.latest
            ? format(headline.latest.markets === 1 ? t.crop.marketReporting : t.crop.marketsReporting, {
                count: formatNumber(headline.latest.markets),
              })
            : undefined
        }
      />

      {crop.tier === 3 && (
        <EmptyState
          title={format(crop.marketsReporting90d === 1 ? t.crop.limitedTitleOne : t.crop.limitedTitle, {
            count: formatNumber(crop.marketsReporting90d),
          })}
        >
          {t.crop.limitedBody}
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

      <Section id="trend" title={t.crop.trend}>
        <TrendChart
          id={`hub-${crop.slug}`}
          crop={crop.slug}
          points={series}
          label={format(t.crop.trendLabel, { crop: name })}
          msp={msp?.price}
          mspLabel={msp ? `MSP ${formatRupees(msp.price)} (${msp.year})` : undefined}
        />
        <p className="mt-3">
          <Link href={`/tools/price-history?crop=${crop.slug}`} className="underline">
            {t.crop.explorePriceHistory}
          </Link>
        </p>
      </Section>

      <Section id="markets" title={t.crop.topMarkets}>
        {topMarkets.length === 0 ? (
          <EmptyState title={t.crop.noMarkets} />
        ) : (
          <LedgerTable caption={format(t.crop.captionByMarket, { crop: name })}>
            <thead>
              <tr>
                <th className={th}>{t.common.market}</th>
                <th className={`${th} text-right`}>{t.crop.modalPriceColumn}</th>
                <th className={th}>{t.crop.dateColumn}</th>
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
            {format(t.crop.findBestMandi, { crop: name })}
          </Link>
        </p>
      </Section>

      {states.length > 0 && (
        <Section id="states" title={t.crop.byState}>
          <LedgerTable caption={format(t.crop.captionByState, { crop: name })}>
            <thead>
              <tr>
                <th className={th}>{t.common.state}</th>
                <th className={`${th} text-right`}>{t.crop.medianColumn}</th>
                <th className={`${th} text-right`}>{t.common.markets}</th>
                <th className={th}>{t.crop.dateColumn}</th>
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
        <Section id="msp" title={t.crop.mspTitle}>
          <p>
            {format(t.crop.mspLine, {
              name: msp.name,
              variety: msp.variety ? ` (${msp.variety})` : "",
              season: msp.season === "other" ? "" : `${msp.season} `,
              year: msp.year,
            })}{" "}
            <strong className="figures">{formatRupees(msp.price)}</strong> {t.crop.perQuintalSuffix}
          </p>
          <p className="mt-2">
            <Link href={`/tools/msp-check?crop=${crop.slug}`} className="underline">
              {t.crop.compareMsp}
            </Link>
          </p>
        </Section>
      )}

      {varieties.length > 0 && (
        <Section id="varieties" title={t.crop.varieties}>
          <LedgerTable caption={format(t.crop.captionByVariety, { crop: name })}>
            <thead>
              <tr>
                <th className={th}>{t.common.variety}</th>
                <th className={`${th} text-right`}>{t.crop.medianColumn}</th>
                <th className={`${th} text-right`}>{t.common.markets}</th>
                <th className={th}>{t.crop.dateColumn}</th>
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
        <Section id="exports" title={t.crop.exports}>
          <ExportSummary
            mapping={mapping}
            years={exportYears}
            countries={exportCountries}
            cropSlug={crop.slug}
          />
        </Section>
      )}

      <Section
        id="brief"
        title={crop.tier === 1 ? t.crop.weeklyBrief : format(t.crop.askAbout, { crop: name })}
      >
        <LatestBrief crop={crop} />
      </Section>

      {related.length > 0 && (
        <Section id="related" title={t.crop.related}>
          <ul className="flex flex-wrap gap-x-6">
            {related.map((r) => (
              <li key={r.slug}>
                <CropLink slug={r.slug} name={cropName(r.slug, r.name, locale)} />
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
