import { sql } from "drizzle-orm";
import { getEnv } from "@/env";
import { INDEXING } from "@/config/tiers";
import { getDb } from "@/lib/db";

/** Indexing rules and sitemap waves (SPEC §9.2). */

export const hubIndexable = (tier: number) => tier <= 2;

export type SitemapWave = 1 | 2 | 3;

/** Which crop tiers and page types a sitemap wave includes. */
export function waveIncludes(wave: SitemapWave) {
  return {
    hubTiers: wave >= 2 ? [1, 2] : [1],
    stateTiers: wave >= 2 ? [1, 2] : [1],
    markets: wave >= 3,
  };
}

export interface SitemapUrl {
  path: string;
  lastModified?: string;
}

export async function hubUrls(
  wave: SitemapWave = getEnv().SITEMAP_WAVE as SitemapWave,
): Promise<SitemapUrl[]> {
  const { hubTiers } = waveIncludes(wave);
  const rows = await getDb().execute<{ slug: string; last: string | null }>(sql`
    select c.slug, (select max(arrival_date)::text from prices_national_daily n where n.commodity_id = c.id) as last
    from commodities c where c.tier = any(${`{${hubTiers.join(",")}}`}::smallint[]) order by c.slug`);
  return rows.rows.map((r) => ({ path: `/crops/${r.slug}`, lastModified: r.last ?? undefined }));
}

export async function stateUrls(
  wave: SitemapWave = getEnv().SITEMAP_WAVE as SitemapWave,
): Promise<SitemapUrl[]> {
  const { stateTiers } = waveIncludes(wave);
  const w = INDEXING.state;
  const rows = await getDb().execute<{ crop: string; state: string; last: string }>(sql`
    with bounds as (select commodity_id, max(arrival_date) as last from prices_market_daily group by commodity_id)
    select c.slug as crop, s.slug as state, max(pm.arrival_date)::text as last
    from prices_market_daily pm
    join bounds b on b.commodity_id = pm.commodity_id
    join commodities c on c.id = pm.commodity_id
    join states s on s.id = pm.state_id
    where pm.arrival_date > b.last - ${w.windowDays}::int and c.tier = any(${`{${stateTiers.join(",")}}`}::smallint[])
    group by c.slug, s.slug
    having count(distinct pm.market_id) >= ${w.minMarkets} and count(distinct pm.arrival_date) >= ${w.minDays}
    order by c.slug, s.slug`);
  return rows.rows.map((r) => ({ path: `/crops/${r.crop}/${r.state}`, lastModified: r.last }));
}

export async function marketUrls(
  wave: SitemapWave = getEnv().SITEMAP_WAVE as SitemapWave,
): Promise<SitemapUrl[]> {
  if (!waveIncludes(wave).markets) return [];
  const w = INDEXING.market;
  const rows = await getDb().execute<{ crop: string; state: string; market: string; last: string }>(sql`
    with bounds as (select commodity_id, max(arrival_date) as last from prices_market_daily group by commodity_id)
    select c.slug as crop, s.slug as state, m.slug as market, max(pm.arrival_date)::text as last
    from prices_market_daily pm
    join bounds b on b.commodity_id = pm.commodity_id
    join commodities c on c.id = pm.commodity_id
    join markets m on m.id = pm.market_id
    join states s on s.id = pm.state_id
    where pm.arrival_date > b.last - ${w.windowDays}::int and c.tier <= 2
    group by c.slug, s.slug, m.slug
    having count(*) >= ${w.minDays}
    order by c.slug, s.slug, m.slug`);
  return rows.rows.map((r) => ({ path: `/crops/${r.crop}/${r.state}/${r.market}`, lastModified: r.last }));
}
