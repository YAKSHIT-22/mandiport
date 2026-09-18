import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState, PlainDate, SourceNote } from "@/components/data/meta";
import { LedgerTable, td, tdNum, th } from "@/components/data/panels";
import { AdSlot } from "@/components/site/ad-slot";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { CROP_GUIDES } from "@/content/crop-guides";
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
  const { crop: slug } = await params;
  const guide = CROP_GUIDES.find((g) => g.slug === slug);
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
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: crop.name, path: `/guides/crops/${slug}` },
        ]}
      />
      <h1>{guide.title}</h1>
      <p className="text-muted-foreground text-sm">Updated {formatDataDate(guide.updated)}</p>

      {guide.intro.map((p) => (
        <p key={p.slice(0, 30)}>{p}</p>
      ))}

      <h2 className="mt-10">Today’s picture</h2>
      {headline.latest ? (
        <p>
          The national median {crop.name.toLowerCase()} price was{" "}
          <strong className="figures">{formatRupees(headline.latest.value)}</strong> per quintal on{" "}
          <PlainDate date={headline.latest.date} />, from {formatNumber(headline.latest.markets)} markets.{" "}
          <Link href={`/crops/${crop.slug}`}>See the live {crop.name.toLowerCase()} page</Link> for the trend
          and market-wise prices.
        </p>
      ) : (
        <EmptyState title={`No ${crop.name.toLowerCase()} prices have been reported yet`} />
      )}

      <AdSlot position="guide-mid" />

      <h2 className="mt-10">Season and calendar</h2>
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

      <h2 className="mt-10">Varieties and grades</h2>
      {guide.varieties.map((p) => (
        <p key={p.slice(0, 30)}>{p}</p>
      ))}
      {varieties.length > 0 && (
        <LedgerTable caption={`${crop.name}: varieties reported recently`} className="mt-4">
          <thead>
            <tr>
              <th className={th}>Variety</th>
              <th className={`${th} text-right`}>Median price</th>
              <th className={`${th} text-right`}>Markets</th>
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

      <h2 className="mt-10">Where it is trading now</h2>
      {topMarkets.length === 0 ? (
        <EmptyState title="No market has reported this crop in the last 30 days" />
      ) : (
        <>
          <p>
            These markets reported the highest prices recently. Prices are as reported on the date shown, and
            do not include transport or mandi charges.
          </p>
          <LedgerTable caption={`${crop.name}: highest recent market prices`} className="mt-4">
            <thead>
              <tr>
                <th className={th}>Market</th>
                <th className={`${th} text-right`}>Modal price</th>
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

      <h2 className="mt-10">Selling notes</h2>
      {guide.selling.map((p) => (
        <p key={p.slice(0, 30)}>{p}</p>
      ))}
      <p>
        Use the <Link href={`/tools/best-mandi?crop=${crop.slug}`}>best mandi tool</Link> to compare take-home
        prices after transport, and the{" "}
        <Link href={`/tools/price-history?crop=${crop.slug}`}>price history tool</Link> to see how prices have
        moved.
      </p>

      {msp && (
        <>
          <h2 className="mt-10">Support price</h2>
          <p>
            The minimum support price for {msp.name.toLowerCase()}
            {msp.variety ? ` (${msp.variety})` : ""} in {msp.season === "other" ? "" : `the ${msp.season} `}
            marketing season {msp.year} is <strong className="figures">{formatRupees(msp.price)}</strong> per
            quintal. <Link href={`/tools/msp-check?crop=${crop.slug}`}>Compare it with state prices</Link>,
            and read <Link href="/guides/msp-explained">what MSP does and does not guarantee</Link>.
          </p>
        </>
      )}

      {mapping && exportYears.length > 0 && (
        <>
          <h2 className="mt-10">Export basics</h2>
          <p>
            In trade statistics this crop falls inside the broad group <strong>{mapping.exportName}</strong>,
            so export figures cover more than this crop alone. The latest published year is{" "}
            {exportYears.at(-1)!.year}.{" "}
            <Link href={`/tools/export-destinations?crop=${crop.slug}`}>See destinations and growth</Link>,
            and read <Link href="/guides/export-data">how export data works</Link>.
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
function GuideWithoutData({ guide, slug }: { guide: (typeof CROP_GUIDES)[number]; slug: string }) {
  return (
    <article className="w-full max-w-none space-y-2">
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: guide.title, path: `/guides/crops/${slug}` },
        ]}
      />
      <h1>{guide.title}</h1>
      {[...guide.intro, ...guide.seasons, ...guide.varieties, ...guide.selling].map((p) => (
        <p key={p.slice(0, 30)}>{p}</p>
      ))}
      <EmptyState title="Live prices for this crop are not available right now">
        <Link href="/crops">Browse all crops</Link> or try again shortly.
      </EmptyState>
    </article>
  );
}
