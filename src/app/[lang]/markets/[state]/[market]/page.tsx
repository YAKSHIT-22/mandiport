import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "drizzle-orm";
import { format, getDict, getLocale } from "@/lib/i18n/dictionary";
import { cropName } from "@/lib/i18n/names";
import { LedgerTable, td, tdNum, th } from "@/components/data/panels";
import { EmptyState, PlainDate, SourceNote } from "@/components/data/meta";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { getDb } from "@/lib/db";
import { formatRupees } from "@/lib/format";
import { getMarketInState, getStateBySlug } from "@/lib/queries/crop";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 21600;

type Props = { params: Promise<{ state: string; market: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: s, market: m } = await params;
  const state = await getStateBySlug(s);
  const market = state ? await getMarketInState(state.id, m) : null;
  if (!state || !market) return { title: "Not found", robots: { index: false } };
  // A directory page: the crop × market pages carry the content, so this one is not indexed.
  return pageMetadata({
    title: `${market.name} mandi prices, ${state.name}`,
    description: `Crops recently reported at ${market.name}, ${market.district}, ${state.name}, with latest prices and dates.`,
    path: `/markets/${state.slug}/${market.slug}`,
    index: false,
  });
}

export default async function MarketDirectoryPage({ params }: Props) {
  const t = await getDict();
  const locale = await getLocale();
  const { state: s, market: m } = await params;
  const state = await getStateBySlug(s);
  const market = state ? await getMarketInState(state.id, m) : null;
  if (!state || !market) notFound();
  const rows = await getDb().execute<{ slug: string; name: string; date: string; modal: number }>(sql`
    select distinct on (c.id) c.slug, c.display_name as name, pm.arrival_date::text as date, pm.modal_price as modal
    from prices_market_daily pm join commodities c on c.id = pm.commodity_id
    where pm.market_id = ${market.id} and pm.arrival_date > current_date - 90
    order by c.id, pm.arrival_date desc`);
  const crops = [...rows.rows].sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));

  return (
    <main className="container-mp space-y-6 py-6">
      <Breadcrumbs
        crumbs={[
          { name: t.chrome.home, path: "/" },
          { name: state.name, path: `/states/${state.slug}` },
          { name: market.name, path: `/markets/${state.slug}/${market.slug}` },
        ]}
      />
      <h1>{market.name}</h1>
      <p>{format(t.place.marketSubtitleShort, { district: market.district, state: state.name })}</p>
      {crops.length === 0 ? (
        <EmptyState title={t.place.noCropsMarket} />
      ) : (
        <LedgerTable caption={format(t.place.captionMarketPrices, { market: market.name })}>
          <thead>
            <tr>
              <th className={th}>{t.place.cropColumn}</th>
              <th className={`${th} text-right`}>{t.place.modalColumn}</th>
              <th className={th}>{t.crop.dateColumn}</th>
            </tr>
          </thead>
          <tbody>
            {crops.map((c) => (
              <tr key={c.slug}>
                <td className={td}>
                  <Link href={`/crops/${c.slug}/${state.slug}/${market.slug}`} className="underline">
                    {cropName(c.slug, c.name, locale)}
                  </Link>
                </td>
                <td className={tdNum}>{formatRupees(c.modal)}</td>
                <td className={td}>
                  <PlainDate date={c.date} />
                </td>
              </tr>
            ))}
          </tbody>
        </LedgerTable>
      )}
      <SourceNote datasets={["mandiVariety", "mandiDaily"]} />
    </main>
  );
}
