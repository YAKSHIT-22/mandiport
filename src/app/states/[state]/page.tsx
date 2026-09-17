import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "drizzle-orm";
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
          { name: "Home", path: "/" },
          { name: state.name, path: `/states/${state.slug}` },
        ]}
      />
      <h1>Mandi prices in {state.name}</h1>
      <p>
        Crops reported by markets in {state.name} in the last 30 days, with the state median on the latest
        date.
      </p>
      {crops.length === 0 ? (
        <EmptyState title="No crops reported in the last 30 days" />
      ) : (
        <LedgerTable caption={`Crops in ${state.name}`}>
          <thead>
            <tr>
              <th className={th}>Crop</th>
              <th className={`${th} text-right`}>Median (₹/quintal)</th>
              <th className={`${th} text-right`}>Markets</th>
              <th className={th}>Date</th>
            </tr>
          </thead>
          <tbody>
            {crops.map((c) => (
              <tr key={c.slug}>
                <td className={td}>
                  <Link href={`/crops/${c.slug}/${state.slug}`} className="underline">
                    {c.name}
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
