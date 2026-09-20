import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LedgerTable, PricePanel, Section, td, tdNum, th } from "@/components/data/panels";
import { EmptyState, PlainDate, SourceNote } from "@/components/data/meta";
import { TrendChart } from "@/components/data/trend-chart";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { INDEXING } from "@/config/tiers";
import { daysBefore, formatDataDate } from "@/lib/dates";
import { formatNumber, formatRupees } from "@/lib/format";
import {
  getCropBySlug,
  getLatestMsp,
  getMarketsInState,
  getStateBySlug,
  getStateSeries,
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

type Props = { params: Promise<{ crop: string; state: string }> };

async function load(params: Props["params"]) {
  const { crop: cropSlug, state: stateSlug } = await params;
  const [crop, state] = await Promise.all([getCropBySlug(cropSlug), getStateBySlug(stateSlug)]);
  if (!crop || !state) return null;
  const [series, markets] = await Promise.all([
    getStateSeries(crop.id, state.id),
    getMarketsInState(crop.id, state.id),
  ]);
  // SPEC §9.2: indexable with ≥ 3 reporting markets and ≥ 20 reporting days in the last 90 days.
  const last = series.at(-1)?.date;
  const windowStart = last ? daysBefore(last, INDEXING.state.windowDays - 1) : "";
  const reporting90d = markets.filter((m) => m.days90d > 0).length;
  const days90d = last ? series.filter((p) => p.date >= windowStart).length : 0;
  const indexable = reporting90d >= INDEXING.state.minMarkets && days90d >= INDEXING.state.minDays;
  return { crop, state, series, markets, indexable };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load(params);
  if (!data) return { title: "Not found", robots: { index: false } };
  const { crop, state, series, indexable } = data;
  const latest = series.at(-1);
  return pageMetadata({
    title: `${crop.name} price in ${state.name} mandis`,
    description: latest
      ? `${crop.name} in ${state.name}: median ${formatRupees(latest.value)}/quintal on ${formatDataDate(latest.date)} from ${formatNumber(latest.markets)} markets. Market-wise prices and trend.`
      : `${crop.name} mandi prices in ${state.name} from official data.`,
    path: `/crops/${crop.slug}/${state.slug}`,
    index: indexable,
  });
}

export default async function CropStatePage({ params }: Props) {
  const data = await load(params);
  if (!data) notFound();
  const { crop, state, series, markets } = data;
  const msp = await getLatestMsp(crop.id);
  const headline = headlineFrom(series);
  const sortedByPrice = [...markets].sort((a, b) => b.modal - a.modal);
  const path = `/crops/${crop.slug}/${state.slug}`;
  const copy = buildPageCopy({
    slug: `${crop.slug}-${state.slug}`,
    crop: crop.name,
    place: state.name,
    latest: headline.latest
      ? { price: headline.latest.value, date: headline.latest.date, markets: headline.latest.markets }
      : undefined,
    weekAgo: headline.weekAgo && { price: headline.weekAgo.value, date: headline.weekAgo.date },
    monthAgo: headline.monthAgo && { price: headline.monthAgo.value, date: headline.monthAgo.date },
    highest: sortedByPrice[0] && {
      market: sortedByPrice[0].name,
      price: sortedByPrice[0].modal,
      date: sortedByPrice[0].latestDate,
    },
    lowest: sortedByPrice.at(-1) && {
      market: sortedByPrice.at(-1)!.name,
      price: sortedByPrice.at(-1)!.modal,
      date: sortedByPrice.at(-1)!.latestDate,
    },
    msp: msp && { price: msp.price, season: msp.season, year: msp.year },
  });

  return (
    <main className="container-mp space-y-8 py-6">
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Crops", path: "/crops" },
          { name: crop.name, path: `/crops/${crop.slug}` },
          { name: state.name, path },
        ]}
      />
      <h1>
        {crop.name} prices in {state.name}
      </h1>
      <PricePanel
        label={`${state.name} median modal price`}
        headline={headline}
        marketsLabel={
          headline.latest
            ? `${formatNumber(headline.latest.markets)} ${headline.latest.markets === 1 ? "market" : "markets"} reporting`
            : undefined
        }
      />
      {copy.length > 0 && (
        <div className="prose-mp">
          {copy.map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
        </div>
      )}
      <Section id="trend" title="State median trend">
        <TrendChart
          id={`state-${crop.slug}-${state.slug}`}
          crop={crop.slug}
          points={series}
          label={`${crop.name} median price in ${state.name}`}
          msp={msp?.price}
        />
      </Section>
      <Section id="markets" title="Markets reporting">
        {markets.length === 0 ? (
          <EmptyState
            title={`No market in ${state.name} reported ${crop.name.toLowerCase()} in the last 180 days`}
          >
            <Link href={`/crops/${crop.slug}`} className="underline">
              See national prices
            </Link>
          </EmptyState>
        ) : (
          <LedgerTable caption={`${crop.name} markets in ${state.name}`}>
            <thead>
              <tr>
                <th className={th}>Market</th>
                <th className={`${th} text-right`}>Latest (₹/quintal)</th>
                <th className={th}>Date</th>
                <th className={`${th} text-right`}>Days reported (90)</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((m) => (
                <tr key={m.marketId}>
                  <td className={td}>
                    <Link href={`${path}/${m.slug}`} className="font-semibold underline">
                      {m.name}
                    </Link>
                    <span className="text-muted-foreground block text-sm">{m.district}</span>
                  </td>
                  <td className={tdNum}>{formatRupees(m.modal)}</td>
                  <td className={td}>
                    <PlainDate date={m.latestDate} />
                  </td>
                  <td className={tdNum}>{formatNumber(m.days90d)}</td>
                </tr>
              ))}
            </tbody>
          </LedgerTable>
        )}
        <p className="mt-3">
          <Link href={`/tools/best-mandi?crop=${crop.slug}`} className="underline">
            Compare take-home prices after transport
          </Link>
          {" · "}
          <Link href={`/tools/msp-check?crop=${crop.slug}&state=${state.slug}`} className="underline">
            MSP check for {state.name}
          </Link>
        </p>
      </Section>
      <SourceNote datasets={["mandiVariety", "mandiDaily", ...(msp ? (["msp"] as const) : [])]} />
      {series.length > 0 && (
        <JsonLd
          data={datasetJsonLd({
            name: `${crop.name} mandi prices in ${state.name}`,
            description: `Daily wholesale prices of ${crop.name.toLowerCase()} reported by markets in ${state.name}, with the state median.`,
            path,
            startDate: series[0]!.date,
            endDate: series.at(-1)!.date,
            spatial: `${state.name}, India`,
            datasets: ["mandiVariety", "mandiDaily"],
          })}
        />
      )}
    </main>
  );
}
