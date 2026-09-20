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
import { formatNumber, formatRupees } from "@/lib/format";
import { getStateBySlug } from "@/lib/queries/crop";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 21600;

type Props = { params: Promise<{ state: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const state = await getStateBySlug((await params).state);
  if (!state) return { title: "Not found", robots: { index: false } };
  return pageMetadata({
    title: `Mandi prices in ${state.name}`,
    description: `Crops reported by mandis in ${state.name}, with the latest state median price and number of markets.`,
    path: `/states/${state.slug}`,
    index: false,
  });
}

export default async function StateDirectoryPage({ params }: Props) {
  const t = await getDict();
  const locale = await getLocale();
  const state = await getStateBySlug((await params).state);
  if (!state) notFound();
  const rows = await getDb().execute<{
    slug: string;
    name: string;
    date: string;
    median: number;
    markets: number;
  }>(sql`
    select distinct on (c.id) c.slug, c.display_name as name, sd.arrival_date::text as date, sd.median_modal as median, sd.markets_reporting as markets
    from prices_state_daily sd join commodities c on c.id = sd.commodity_id
    where sd.state_id = ${state.id} and sd.arrival_date > current_date - 30
    order by c.id, sd.arrival_date desc`);
  const crops = [...rows.rows].sort((a, b) => b.markets - a.markets || a.name.localeCompare(b.name));
  return (
    <main className="container-mp space-y-6 py-6">
      <Breadcrumbs
        crumbs={[
          { name: t.chrome.home, path: "/" },
          { name: state.name, path: `/states/${state.slug}` },
        ]}
      />
      <h1>{format(t.place.statePrices, { state: state.name })}</h1>
      <p>{format(t.place.stateIntro, { state: state.name })}</p>
      {crops.length === 0 ? (
        <EmptyState title={t.place.noCropsState} />
      ) : (
        <LedgerTable caption={format(t.place.captionStateCrops, { state: state.name })}>
          <thead>
            <tr>
              <th className={th}>{t.place.cropColumn}</th>
              <th className={`${th} text-right`}>{t.crop.medianColumn}</th>
              <th className={`${th} text-right`}>{t.common.markets}</th>
              <th className={th}>{t.crop.dateColumn}</th>
            </tr>
          </thead>
          <tbody>
            {crops.map((c) => (
              <tr key={c.slug}>
                <td className={td}>
                  <Link href={`/crops/${c.slug}/${state.slug}`} className="underline">
                    {cropName(c.slug, c.name, locale)}
                  </Link>
                </td>
                <td className={tdNum}>{formatRupees(c.median)}</td>
                <td className={tdNum}>{formatNumber(c.markets)}</td>
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
