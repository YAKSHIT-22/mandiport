import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

export type Mover = {
  slug: string;
  name: string;
  latestDate: string;
  latest: number;
  previousDate: string;
  previous: number;
  percent: number;
  markets: number;
};

/**
 * Biggest price moves vs about a week earlier (SPEC §8.1): Tier 1–2 only, and only where at
 * least `minMarkets` markets reported on both dates, so a single market cannot create a "mover".
 */
export async function getBiggestMovers(
  limit = 6,
  minMarkets = 10,
  categorySlug?: string,
): Promise<{ up: Mover[]; down: Mover[] }> {
  const rows = await getDb().execute<Mover>(sql`
    with latest as (
      select distinct on (n.commodity_id) n.commodity_id, n.arrival_date, n.median_modal, n.markets_reporting
      from prices_national_daily n
      where n.arrival_date > (select max(arrival_date) from prices_national_daily) - 3
      order by n.commodity_id, n.arrival_date desc
    ),
    previous as (
      select distinct on (n.commodity_id) n.commodity_id, n.arrival_date, n.median_modal, n.markets_reporting
      from prices_national_daily n join latest l on l.commodity_id = n.commodity_id
      where n.arrival_date between l.arrival_date - 10 and l.arrival_date - 7
      order by n.commodity_id, n.arrival_date desc
    )
    select c.slug, c.display_name as name, l.arrival_date::text as "latestDate", l.median_modal as latest,
           p.arrival_date::text as "previousDate", p.median_modal as previous,
           round(((l.median_modal - p.median_modal)::numeric / p.median_modal) * 100, 1)::float as percent,
           least(l.markets_reporting, p.markets_reporting) as markets
    from latest l join previous p on p.commodity_id = l.commodity_id
    join commodities c on c.id = l.commodity_id
    left join categories cat on cat.id = c.category_id
    where c.tier <= 2 and l.markets_reporting >= ${minMarkets} and p.markets_reporting >= ${minMarkets}
      ${categorySlug ? sql`and cat.slug = ${categorySlug} and c.category_confirmed` : sql``}`);
  const all = rows.rows.filter((r) => r.percent !== 0);
  return {
    up: all
      .filter((r) => r.percent > 0)
      .sort((a, b) => b.percent - a.percent)
      .slice(0, limit),
    down: all
      .filter((r) => r.percent < 0)
      .sort((a, b) => a.percent - b.percent)
      .slice(0, limit),
  };
}

export type CropListItem = {
  slug: string;
  name: string;
  tier: number;
  categorySlug: string;
  categoryName: string;
  markets: number;
};

/** All commodities; unconfirmed categories are listed under "Others" (SPEC §6.5). */
export async function getAllCrops(): Promise<CropListItem[]> {
  const rows = await getDb().execute<CropListItem>(sql`
    select c.slug, c.display_name as name, c.tier,
           case when c.category_confirmed and cat.slug is not null then cat.slug else 'others' end as "categorySlug",
           case when c.category_confirmed and cat.name is not null then cat.name else 'Others' end as "categoryName",
           c.markets_reporting_90d as markets
    from commodities c left join categories cat on cat.id = c.category_id
    order by lower(c.display_name)`);
  return rows.rows;
}

export type CategoryRow = {
  slug: string;
  name: string;
  count: number;
};

export async function getCategories(): Promise<CategoryRow[]> {
  const rows = await getDb().execute<CategoryRow>(sql`
    select cat.slug, cat.name,
      (select count(*)::int from commodities c
        where (c.category_confirmed and c.category_id = cat.id)
           or (cat.slug = 'others' and (not c.category_confirmed or c.category_id is null))) as count
    from categories cat order by cat.sort_order`);
  return rows.rows;
}

export async function getLatestDataDate(): Promise<string | null> {
  const rows = await getDb().execute<{ d: string | null }>(
    sql`select max(arrival_date)::text as d from prices_national_daily`,
  );
  return rows.rows[0]?.d ?? null;
}

export type SearchResult = {
  type: "crop" | "variety" | "market" | "state";
  label: string;
  detail: string;
  href: string;
};

/**
 * Typeahead across commodities, varieties, markets and states (SPEC §8.1). Uses prefix and
 * trigram similarity; Hindi names are matched when present.
 */
export async function searchSite(query: string, limit = 12): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  const rows = await getDb().execute<SearchResult & { score: number }>(sql`
    (select 'crop' as type, c.display_name as label, coalesce(cat.name, 'Crop') as detail, '/crops/' || c.slug as href,
            (case when lower(c.display_name) like ${`${q}%`} then 2 else 0 end + similarity(lower(c.display_name), ${q}) + (4 - c.tier) * 0.1) as score
     from commodities c left join categories cat on cat.id = c.category_id
     where lower(c.display_name) like ${like} or lower(c.source_name) like ${like} or lower(coalesce(c.name_hi, '')) like ${like}
        or similarity(lower(c.display_name), ${q}) > 0.3
     order by score desc limit ${limit})
    union all
    (select 'variety', v.display_name, c.display_name || ' variety', '/crops/' || c.slug,
            similarity(lower(v.display_name), ${q}) + (case when lower(v.display_name) like ${`${q}%`} then 1 else 0 end)
     from varieties v join commodities c on c.id = v.commodity_id
     where lower(v.display_name) like ${like} and lower(v.display_name) <> lower(c.display_name) and v.display_name <> 'Other'
     order by 5 desc limit 5)
    union all
    (select 'market', m.name, d.name || ', ' || s.name, '/markets/' || s.slug || '/' || m.slug,
            similarity(lower(m.name), ${q}) + (case when lower(m.name) like ${`${q}%`} then 1 else 0 end)
     from markets m join districts d on d.id = m.district_id join states s on s.id = d.state_id
     where lower(m.name) like ${like} or similarity(lower(m.name), ${q}) > 0.35
     order by 5 desc limit 6)
    union all
    (select 'state', s.name, 'State', '/states/' || s.slug, 1.5 + similarity(lower(s.name), ${q})
     from states s where lower(s.name) like ${like}
     limit 3)`);
  return rows.rows
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ type, label, detail, href }) => ({ type, label, detail, href }));
}

export type SiteStats = {
  commodities: number;
  markets: number;
  states: number;
  days: number;
};

/** Headline counts for the home page, straight from the database. */
export async function getSiteStats(): Promise<SiteStats> {
  const rows = await getDb().execute<SiteStats>(sql`
    select (select count(*)::int from commodities) as commodities,
           (select count(*)::int from markets) as markets,
           (select count(*)::int from states) as states,
           (select count(distinct arrival_date)::int from prices_national_daily) as days`);
  return rows.rows[0] ?? { commodities: 0, markets: 0, states: 0, days: 0 };
}
