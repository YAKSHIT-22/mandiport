import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState, PlainDate, SourceNote } from "@/components/data/meta";
import { LedgerTable, td, tdNum, th } from "@/components/data/panels";
import { AdSlot } from "@/components/site/ad-slot";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { CROP_GUIDES } from "@/content/crop-guides";
import { CROP_GUIDES_HI } from "@/content/crop-guides-hi";
import { format, getDict, getLocale } from "@/lib/i18n/dictionary";
import { cropName } from "@/lib/i18n/names";
import { tryQuery } from "@/lib/db/safe";
import { formatDataDate } from "@/lib/dates";
import { formatNumber, formatRupees } from "@/lib/format";
import {
  getCropBySlug,
  getFirstDataDate,
  getLatestMsp,
  getNationalSeries,
  getStatesForCrop,
  getTopMarkets,
  getVarietyPrices,
  headlineFrom,
} from "@/lib/queries/crop";
import { getExportMapping, getExportYears } from "@/lib/queries/exports";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 21600;
export const dynamicParams = false;

export function generateStaticParams() {
  return CROP_GUIDES.map((g) => ({ crop: g.slug }));
}

type Props = { params: Promise<{ crop: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { crop } = await params;
  const guide = CROP_GUIDES.find((g) => g.slug === crop);
  if (!guide) return { title: "Guide not found", robots: { index: false } };
  return pageMetadata({
    title: guide.title,
    description: guide.description,
    path: `/guides/crops/${crop}`,
    type: "article",
  });
}

export default async function CropGuidePage({ params }: Props) {
  const t = await getDict();
  const locale = await getLocale();
  const { crop: slug } = await params;
  const english = CROP_GUIDES.find((g) => g.slug === slug);
  // A crop without a Hindi guide keeps the English one rather than a half-translated page.
  const guide = english && locale === "hi" ? { ...english, ...(CROP_GUIDES_HI[slug] ?? {}) } : english;
  if (!guide) notFound();
  // The written sections stand on their own, so the guide still renders without price data.
  const crop = await tryQuery(`guide.crop.${slug}`, () => getCropBySlug(slug), null);
  if (!crop) {
    return <GuideWithoutData guide={guide} slug={slug} />;
  }

  const [series, topMarkets, states, varieties, msp, mapping] = await Promise.all([
    tryQuery("guide.series", () => getNationalSeries(crop.id), []),
    tryQuery("guide.topMarkets", () => getTopMarkets(crop.id, 8), []),
    tryQuery("guide.states", () => getStatesForCrop(crop.id), []),
    tryQuery("guide.varieties", () => getVarietyPrices(crop.id), []),
    tryQuery("guide.msp", () => getLatestMsp(crop.id), null),
    tryQuery("guide.mapping", () => getExportMapping(crop.id), null),
  ]);
  const headline = headlineFrom(series);
  const exportYears = mapping
    ? await tryQuery("guide.exportYears", () => getExportYears(mapping.exportCommodityId), [])
    : [];
  const firstDate = await tryQuery("guide.firstDate", () => getFirstDataDate(crop.id), null);

  return (
    <article className="w-full max-w-none space-y-2">
      <Breadcrumbs
        crumbs={[
          { name: t.chrome.home, path: "/" },
          { name: t.nav.guides, path: "/guides" },
          { name: crop.name, path: `/guides/crops/${slug}` },
        ]}
      />
      <h1>{guide.title}</h1>
      <p className="text-muted-foreground text-sm">
        {format(t.cropGuide.updated, { date: formatDataDate(guide.updated, locale) })}
      </p>

      {guide.intro.map((p) => (
        <p key={p.slice(0, 30)}>{p}</p>
      ))}

      <h2 className="mt-10">{t.cropGuide.todaysPicture}</h2>
      {headline.latest ? (
        <p>
          The national median {crop.name.toLowerCase()} price was{" "}
          <strong className="figures">{formatRupees(headline.latest.value)}</strong> per quintal on{" "}
          <PlainDate date={headline.latest.date} />, from {formatNumber(headline.latest.markets)} markets.{" "}
          <Link href={`/crops/${crop.slug}`}>See the live {crop.name.toLowerCase()} page</Link> for the trend
          and market-wise prices.
        </p>
      ) : (
        <EmptyState
          title={format(t.cropGuide.noPricesYet, { crop: cropName(crop.slug, crop.name, locale) })}
        />
      )}

      <AdSlot position="guide-mid" />

      <h2 className="mt-10">{t.cropGuide.seasonCalendar}</h2>
      {guide.seasons.map((p) => (
        <p key={p.slice(0, 30)}>{p}</p>
      ))}
      {firstDate && (
        <p className="text-muted-foreground text-sm">
          Mandiport holds daily {crop.name.toLowerCase()} prices from {formatDataDate(firstDate)} onwards.
          Monthly averages and seasonality for a specific market appear on each market page once twelve months
          of data exist.
        </p>
      )}

      <h2 className="mt-10">{t.cropGuide.varietiesGrades}</h2>
      {guide.varieties.map((p) => (
        <p key={p.slice(0, 30)}>{p}</p>
      ))}
      {varieties.length > 0 && (
        <LedgerTable
          caption={format(t.cropGuide.varietiesCaption, { crop: cropName(crop.slug, crop.name, locale) })}
          className="mt-4"
        >
          <thead>
            <tr>
              <th className={th}>{t.common.variety}</th>
              <th className={`${th} text-right`}>{t.cropGuide.medianPrice}</th>
              <th className={`${th} text-right`}>{t.common.markets}</th>
              <th className={th}>Date</th>
            </tr>
          </thead>
          <tbody>
            {varieties.slice(0, 8).map((v) => (
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
      )}

      <h2 className="mt-10">{t.cropGuide.tradingNow}</h2>
      {topMarkets.length === 0 ? (
        <EmptyState title={t.cropGuide.noMarket30} />
      ) : (
        <>
          <p>
            These markets reported the highest prices recently. Prices are as reported on the date shown, and
            do not include transport or mandi charges.
          </p>
          <LedgerTable
            caption={format(t.cropGuide.topMarketsCaption, { crop: cropName(crop.slug, crop.name, locale) })}
            className="mt-4"
          >
            <thead>
              <tr>
                <th className={th}>{t.common.market}</th>
                <th className={`${th} text-right`}>{t.common.modalPrice}</th>
                <th className={th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {topMarkets.map((m) => (
                <tr key={`${m.stateSlug}-${m.marketSlug}`}>
                  <td className={td}>
                    <Link href={`/crops/${crop.slug}/${m.stateSlug}/${m.marketSlug}`}>{m.marketName}</Link>
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
          {states.length > 0 && (
            <p className="mt-4">
              States reporting most recently:{" "}
              {states.slice(0, 6).map((s, i) => (
                <span key={s.slug}>
                  {i > 0 && ", "}
                  <Link href={`/crops/${crop.slug}/${s.slug}`}>{s.name}</Link>
                </span>
              ))}
              .
            </p>
          )}
        </>
      )}

      <h2 className="mt-10">{t.cropGuide.sellingNotes}</h2>
      {guide.selling.map((p) => (
        <p key={p.slice(0, 30)}>{p}</p>
      ))}
      <p>
        {t.cropGuide.useTools}{" "}
        <Link href={`/tools/best-mandi?crop=${crop.slug}`}>{t.cropGuide.bestMandiLink}</Link>{" "}
        {t.cropGuide.useToolsMiddle}{" "}
        <Link href={`/tools/price-history?crop=${crop.slug}`}>{t.cropGuide.priceHistoryLink}</Link>{" "}
        {t.cropGuide.useToolsEnd}
      </p>

      {msp && (
        <>
          <h2 className="mt-10">{t.cropGuide.supportPrice}</h2>
          <p>
            {format(t.cropGuide.mspSentence, {
              crop: msp.name,
              variety: msp.variety ? ` (${msp.variety})` : "",
              season: msp.season === "other" ? "" : `${msp.season} `,
              year: msp.year,
              price: formatRupees(msp.price),
            })}{" "}
            <Link href={`/tools/msp-check?crop=${crop.slug}`}>{t.cropGuide.compareStates}</Link>,{" "}
            {t.cropGuide.and} <Link href="/guides/msp-explained">{t.cropGuide.readMsp}</Link>.
          </p>
        </>
      )}

      {mapping && exportYears.length > 0 && (
        <>
          <h2 className="mt-10">{t.cropGuide.exportBasics}</h2>
          <p>
            {format(t.cropGuide.exportSentence, {
              group: mapping.exportName,
              year: exportYears.at(-1)!.year,
            })}{" "}
            <Link href={`/tools/export-destinations?crop=${crop.slug}`}>{t.cropGuide.seeDestinations}</Link>,{" "}
            {t.cropGuide.and} <Link href="/guides/export-data">{t.cropGuide.readExports}</Link>.
          </p>
        </>
      )}

      <div className="mt-10">
        <SourceNote
          datasets={[
            "mandiVariety",
            "mandiDaily",
            ...(msp ? (["msp"] as const) : []),
            ...(mapping ? (["exports"] as const) : []),
          ]}
        />
      </div>
    </article>
  );
}

/** Fallback when the crop is not in the database yet: the written guide, without figures. */
async function GuideWithoutData({ guide, slug }: { guide: (typeof CROP_GUIDES)[number]; slug: string }) {
  const t = await getDict();
  return (
    <article className="w-full max-w-none space-y-2">
      <Breadcrumbs
        crumbs={[
          { name: t.chrome.home, path: "/" },
          { name: t.nav.guides, path: "/guides" },
          { name: guide.title, path: `/guides/crops/${slug}` },
        ]}
      />
      <h1>{guide.title}</h1>
      {[...guide.intro, ...guide.seasons, ...guide.varieties, ...guide.selling].map((p) => (
        <p key={p.slice(0, 30)}>{p}</p>
      ))}
      <EmptyState title={t.cropGuide.unavailable}>
        <Link href="/crops">{t.cropGuide.browseAll}</Link> {t.cropGuide.orRetry}
      </EmptyState>
    </article>
  );
}
