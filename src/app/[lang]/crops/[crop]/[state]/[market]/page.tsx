import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LedgerTable, PricePanel, Section, td, tdNum, th } from "@/components/data/panels";
import { PlainDate, SourceNote } from "@/components/data/meta";
import { SeasonalityBlock } from "@/components/data/seasonality-table";
import { TrendChart } from "@/components/data/trend-chart";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { format, getDict, getLocale } from "@/lib/i18n/dictionary";
import { cropName } from "@/lib/i18n/names";
import { JsonLd } from "@/components/site/json-ld";
import { INDEXING } from "@/config/tiers";
import { daysBefore, formatDataDate } from "@/lib/dates";
import { formatNumber, formatRupees } from "@/lib/format";
import {
  getCropBySlug,
  getFirstDataDate,
  getLatestMsp,
  getMarketInState,
  getMarketMonthly,
  getMarketSeries,
  getStateBySlug,
  getVarietyPrices,
  headlineFrom,
} from "@/lib/queries/crop";
import { buildPageCopy } from "@/lib/seo/copy";
import { datasetJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 21600;
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ crop: string; state: string; market: string }> };

async function load(params: Props["params"]) {
  const { crop: cropSlug, state: stateSlug, market: marketSlug } = await params;
  const [crop, state] = await Promise.all([getCropBySlug(cropSlug), getStateBySlug(stateSlug)]);
  if (!crop || !state) return null;
  const market = await getMarketInState(state.id, marketSlug);
  if (!market) return null;
  const series = await getMarketSeries(crop.id, market.id);
  const last = series.at(-1)?.date;
  // SPEC §9.2: indexable with ≥ 30 reporting days in the last 180 days.
  const days180 = last
    ? series.filter((p) => p.date >= daysBefore(last, INDEXING.market.windowDays - 1)).length
    : 0;
  return { crop, state, market, series, indexable: days180 >= INDEXING.market.minDays, days180 };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load(params);
  if (!data) return { title: "Not found", robots: { index: false } };
  const { crop, state, market, series, indexable } = data;
  const latest = series.at(-1);
  return pageMetadata({
    title: `${crop.name} price at ${market.name}, ${state.name}`,
    description: latest
      ? `${crop.name} at ${market.name} (${market.district}): ${formatRupees(latest.value)}/quintal on ${formatDataDate(latest.date)}. Price history, monthly averages and varieties.`
      : `${crop.name} prices at ${market.name}, ${state.name}.`,
    path: `/crops/${crop.slug}/${state.slug}/${market.slug}`,
    index: indexable,
  });
}

export default async function MarketPage({ params }: Props) {
  const t = await getDict();
  const locale = await getLocale();
  const data = await load(params);
  if (!data) notFound();
  const { crop, state, market, series, days180 } = data;
  const [monthly, firstDate, varieties, msp] = await Promise.all([
    getMarketMonthly(crop.id, market.id),
    getFirstDataDate(crop.id, market.id),
    getVarietyPrices(crop.id, market.id),
    getLatestMsp(crop.id),
  ]);
  const headline = headlineFrom(series);
  const path = `/crops/${crop.slug}/${state.slug}/${market.slug}`;
  const copy = buildPageCopy({
    slug: `${crop.slug}-${state.slug}-${market.slug}`,
    crop: crop.name,
    place: market.name,
    latest: headline.latest ? { price: headline.latest.value, date: headline.latest.date } : undefined,
    weekAgo: headline.weekAgo && { price: headline.weekAgo.value, date: headline.weekAgo.date },
    monthAgo: headline.monthAgo && { price: headline.monthAgo.value, date: headline.monthAgo.date },
    msp: msp && { price: msp.price, season: msp.season, year: msp.year },
  });

  return (
    <main className="container-mp space-y-8 py-6">
      <Breadcrumbs
        crumbs={[
          { name: t.chrome.home, path: "/" },
          { name: cropName(crop.slug, crop.name, locale), path: `/crops/${crop.slug}` },
          { name: state.name, path: `/crops/${crop.slug}/${state.slug}` },
          { name: market.name, path },
        ]}
      />
      <header>
        <h1>
          {format(t.place.cropAtMarket, {
            crop: cropName(crop.slug, crop.name, locale),
            market: market.name,
          })}
        </h1>
        <p className="text-muted-foreground mt-1">
          {format(t.place.marketSubtitle, {
            district: market.district,
            state: state.name,
            days: formatNumber(days180),
          })}
        </p>
      </header>
      <PricePanel label={t.panel.modalAtMarket} headline={headline} />
      {copy.length > 0 && (
        <div className="prose-mp">
          {copy.map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
        </div>
      )}
      <Section id="trend" title={t.place.priceHistorySection}>
        <TrendChart
          id={`market-${market.id}-${crop.slug}`}
          crop={crop.slug}
          points={series}
          label={`${crop.name} modal price at ${market.name}`}
          msp={msp?.price}
        />
      </Section>
      <Section id="seasonality" title={t.place.seasonalitySection}>
        <SeasonalityBlock monthly={monthly} firstDate={firstDate} place={market.name} />
      </Section>
      {varieties.length > 0 && (
        <Section id="varieties" title={t.place.varietiesHere}>
          <LedgerTable
            caption={format(t.place.captionVarietiesHere, {
              crop: cropName(crop.slug, crop.name, locale),
              market: market.name,
            })}
          >
            <thead>
              <tr>
                <th className={th}>{t.common.variety}</th>
                <th className={`${th} text-right`}>{t.place.modalColumn}</th>
                <th className={th}>{t.crop.dateColumn}</th>
              </tr>
            </thead>
            <tbody>
              {varieties.map((v) => (
                <tr key={v.name}>
                  <td className={td}>{v.name}</td>
                  <td className={tdNum}>{formatRupees(v.median)}</td>
                  <td className={td}>
                    <PlainDate date={v.date} />
                  </td>
                </tr>
              ))}
            </tbody>
          </LedgerTable>
        </Section>
      )}
      <p>
        <Link
          href={`/tools/price-history?crop=${crop.slug}&state=${state.slug}&market=${market.slug}`}
          className="underline"
        >
          Open in the price history tool
        </Link>
        {" · "}
        <Link href={`/alerts?crop=${crop.slug}`} className="underline">
          Get a Telegram alert for this price
        </Link>
      </p>
      <SourceNote datasets={["mandiVariety", "mandiDaily", ...(msp ? (["msp"] as const) : [])]} />
      {series.length > 0 && (
        <JsonLd
          data={datasetJsonLd({
            name: `${crop.name} prices at ${market.name}, ${state.name}`,
            description: `Daily modal, minimum and maximum prices of ${crop.name.toLowerCase()} at ${market.name} in ${market.district} district, ${state.name}.`,
            path,
            startDate: series[0]!.date,
            endDate: series.at(-1)!.date,
            spatial: `${market.name}, ${market.district}, ${state.name}, India`,
            datasets: ["mandiVariety", "mandiDaily"],
          })}
        />
      )}
    </main>
  );
}
