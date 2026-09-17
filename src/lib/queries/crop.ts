import { sql } from "drizzle-orm";
import { cache } from "react";
import { INDEXING } from "@/config/tiers";
import { daysBefore } from "@/lib/dates";
import { getDb } from "@/lib/db";

/** Read models for crop, state and market pages. All figures come from the database. */

export type CropRow = {
  id: number;
  slug: string;
  name: string;
  sourceName: string;
  tier: 1 | 2 | 3;
  marketsReporting90d: number;
  daysReported90d: number;
  categorySlug: string | null;
  categoryName: string | null;
  categoryConfirmed: boolean;
};

const cropSelect = sql`
  select c.id, c.slug, c.display_name as name, c.source_name as "sourceName", c.tier,
         c.markets_reporting_90d as "marketsReporting90d", c.days_reported_90d as "daysReported90d",
         cat.slug as "categorySlug", cat.name as "categoryName", c.category_confirmed as "categoryConfirmed"
  from commodities c left join categories cat on cat.id = c.category_id`;

export const getCropBySlug = cache(async (slug: string): Promise<CropRow | null> => {
  const rows = await getDb().execute<CropRow>(sql`${cropSelect} where c.slug = ${slug}`);
  return rows.rows[0] ?? null;
});

export type PricePoint = {
  date: string;
  value: number;
  min: number;
  max: number;
  markets: number;
};

export type Headline = {
  latest: PricePoint | null;
  weekAgo: PricePoint | null;
  monthAgo: PricePoint | null;
};

/** Nearest point on or before `target`, within `toleranceDays`. */
export function pointNear(points: PricePoint[], target: string, toleranceDays = 3): PricePoint | null {
  const floor = daysBefore(target, toleranceDays);
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i]!;
    if (p.date <= target && p.date >= floor) return p;
    if (p.date < floor) break;
  }
  return null;
}

export function headlineFrom(points: PricePoint[]): Headline {
  const latest = points.at(-1) ?? null;
  if (!latest) return { latest: null, weekAgo: null, monthAgo: null };
  return {
    latest,
    weekAgo: pointNear(points, daysBefore(latest.date, 7)),
    monthAgo: pointNear(points, daysBefore(latest.date, 30)),
  };
}

/** National median series, ascending, last 365 days of data. */
export const getNationalSeries = cache(async (commodityId: number): Promise<PricePoint[]> => {
  const rows = await getDb().execute<PricePoint>(sql`
    select arrival_date::text as date, median_modal as value, min_modal as min, max_modal as max, markets_reporting as markets
    from prices_national_daily
    where commodity_id = ${commodityId}
      and arrival_date > (select max(arrival_date) from prices_national_daily where commodity_id = ${commodityId}) - 365
    order by arrival_date`);
  return rows.rows;
});

export type MarketPrice = {
  marketSlug: string;
  marketName: string;
  districtName: string;
  stateSlug: string;
  stateName: string;
  date: string;
  modal: number;
  min: number;
  max: number;
};

/** Latest price per market within the last 30 days of data, highest first. */
export async function getTopMarkets(
  commodityId: number,
  limit = 10,
  stateId?: number,
): Promise<MarketPrice[]> {
  const rows = await getDb().execute<MarketPrice>(sql`
    with latest as (
      select distinct on (pm.market_id) pm.market_id, pm.arrival_date, pm.modal_price, pm.min_price, pm.max_price
      from prices_market_daily pm
      where pm.commodity_id = ${commodityId}
        ${stateId ? sql`and pm.state_id = ${stateId}` : sql``}
        and pm.arrival_date > (select max(arrival_date) from prices_market_daily where commodity_id = ${commodityId}) - 30
      order by pm.market_id, pm.arrival_date desc
    )
    select m.slug as "marketSlug", m.name as "marketName", d.name as "districtName", s.slug as "stateSlug", s.name as "stateName",
           l.arrival_date::text as date, l.modal_price as modal, l.min_price as min, l.max_price as max
    from latest l join markets m on m.id = l.market_id join districts d on d.id = m.district_id join states s on s.id = d.state_id
    order by l.modal_price desc, m.name
    limit ${limit}`);
  return rows.rows;
}

export type StateSummary = {
  stateId: number;
  slug: string;
  name: string;
  latestDate: string;
  median: number;
  marketsLatest: number;
  markets90d: number;
  days90d: number;
  indexable: boolean;
};

export async function getStatesForCrop(commodityId: number): Promise<StateSummary[]> {
  const w = INDEXING.state;
  const rows = await getDb().execute<Omit<StateSummary, "indexable">>(sql`
    with bounds as (select max(arrival_date) as last from prices_market_daily where commodity_id = ${commodityId}),
    latest as (
      select distinct on (sd.state_id) sd.state_id, sd.arrival_date, sd.median_modal, sd.markets_reporting
      from prices_state_daily sd, bounds
      where sd.commodity_id = ${commodityId} and sd.arrival_date > bounds.last - 30
      order by sd.state_id, sd.arrival_date desc
    ),
    activity as (
      select pm.state_id, count(distinct pm.market_id)::int as markets, count(distinct pm.arrival_date)::int as days
      from prices_market_daily pm, bounds
      where pm.commodity_id = ${commodityId} and pm.arrival_date > bounds.last - ${w.windowDays}::int
      group by pm.state_id
    )
    select s.id as "stateId", s.slug, s.name, l.arrival_date::text as "latestDate", l.median_modal as median,
           l.markets_reporting as "marketsLatest", coalesce(a.markets, 0) as "markets90d", coalesce(a.days, 0) as "days90d"
    from latest l join states s on s.id = l.state_id left join activity a on a.state_id = l.state_id
    order by l.median_modal desc`);
  return rows.rows.map((r) => ({ ...r, indexable: r.markets90d >= w.minMarkets && r.days90d >= w.minDays }));
}

export type VarietyPrice = {
  name: string;
  date: string;
  median: number;
  markets: number;
};

/** Latest date per variety within 30 days; median across markets on that date. */
export async function getVarietyPrices(commodityId: number, marketId?: number): Promise<VarietyPrice[]> {
  const rows = await getDb().execute<VarietyPrice>(sql`
    with scoped as (
      select p.variety_id, p.arrival_date, p.modal_price, p.market_id
      from prices_daily p
      where p.commodity_id = ${commodityId} and p.variety_id is not null
        ${marketId ? sql`and p.market_id = ${marketId}` : sql``}
        and p.arrival_date > (select max(arrival_date) from prices_daily where commodity_id = ${commodityId}) - 30
    ),
    last_day as (select variety_id, max(arrival_date) as d from scoped group by variety_id)
    select v.display_name as name, ld.d::text as date,
           round(percentile_cont(0.5) within group (order by s.modal_price))::int as median,
           count(distinct s.market_id)::int as markets
    from last_day ld
    join scoped s on s.variety_id = ld.variety_id and s.arrival_date = ld.d
    join varieties v on v.id = ld.variety_id
    group by v.display_name, ld.d
    order by markets desc, v.display_name
    limit 20`);
  return rows.rows;
}

export type MspInfo = {
  season: string;
  year: string;
  price: number;
  variety: string | null;
  name: string;
};

export const getLatestMsp = cache(async (commodityId: number): Promise<MspInfo | null> => {
  const rows = await getDb().execute<MspInfo>(sql`
    select season, year, msp_price as price, variety, source_name as name
    from msp where commodity_id = ${commodityId}
    order by year desc limit 1`);
  return rows.rows[0] ?? null;
});

export type RelatedCrop = {
  slug: string;
  name: string;
  tier: number;
};

export async function getRelatedCrops(crop: CropRow, limit = 8): Promise<RelatedCrop[]> {
  if (!crop.categorySlug) return [];
  const rows = await getDb().execute<RelatedCrop>(sql`
    select c.slug, c.display_name as name, c.tier from commodities c join categories cat on cat.id = c.category_id
    where cat.slug = ${crop.categorySlug} and c.id <> ${crop.id} and c.tier <= 2
    order by c.markets_reporting_90d desc limit ${limit}`);
  return rows.rows;
}

// ─── State and market ─────────────────────────────────────────────────────────

export type StateRow = {
  id: number;
  slug: string;
  name: string;
};

export const getStateBySlug = cache(async (slug: string): Promise<StateRow | null> => {
  const rows = await getDb().execute<StateRow>(sql`select id, slug, name from states where slug = ${slug}`);
  return rows.rows[0] ?? null;
});

export async function getStateSeries(commodityId: number, stateId: number): Promise<PricePoint[]> {
  const rows = await getDb().execute<PricePoint>(sql`
    with pts as (
      select pm.arrival_date, pm.modal_price, pm.min_price, pm.max_price
      from prices_market_daily pm
      where pm.commodity_id = ${commodityId} and pm.state_id = ${stateId}
        and pm.arrival_date > (select max(arrival_date) from prices_market_daily where commodity_id = ${commodityId} and state_id = ${stateId}) - 365
    )
    select arrival_date::text as date, round(percentile_cont(0.5) within group (order by modal_price))::int as value,
           min(modal_price) as min, max(modal_price) as max, count(*)::int as markets
    from pts group by arrival_date order by arrival_date`);
  return rows.rows;
}

export type StateMarket = {
  marketId: number;
  slug: string;
  name: string;
  district: string;
  latestDate: string;
  modal: number;
  days90d: number;
  days180d: number;
  indexable: boolean;
};

export async function getMarketsInState(commodityId: number, stateId: number): Promise<StateMarket[]> {
  const rows = await getDb().execute<Omit<StateMarket, "indexable">>(sql`
    with bounds as (select max(arrival_date) as last from prices_market_daily where commodity_id = ${commodityId}),
    activity as (
      select pm.market_id,
             count(*) filter (where pm.arrival_date > bounds.last - 90)::int as days90,
             count(*) filter (where pm.arrival_date > bounds.last - ${INDEXING.market.windowDays}::int)::int as days180,
             max(pm.arrival_date) as last_date
      from prices_market_daily pm, bounds
      where pm.commodity_id = ${commodityId} and pm.state_id = ${stateId} and pm.arrival_date > bounds.last - ${INDEXING.market.windowDays}::int
      group by pm.market_id
    )
    select m.id as "marketId", m.slug, m.name, d.name as district, a.last_date::text as "latestDate", pm.modal_price as modal,
           a.days90 as "days90d", a.days180 as "days180d"
    from activity a
    join markets m on m.id = a.market_id join districts d on d.id = m.district_id
    join prices_market_daily pm on pm.market_id = a.market_id and pm.commodity_id = ${commodityId} and pm.arrival_date = a.last_date
    order by a.days90 desc, m.name`);
  return rows.rows.map((r) => ({ ...r, indexable: r.days180d >= INDEXING.market.minDays }));
}

export type MarketRow = {
  id: number;
  slug: string;
  name: string;
  district: string;
  stateId: number;
};

export async function getMarketInState(stateId: number, marketSlug: string): Promise<MarketRow | null> {
  const rows = await getDb().execute<MarketRow>(sql`
    select m.id, m.slug, m.name, d.name as district, d.state_id as "stateId"
    from markets m join districts d on d.id = m.district_id
    where d.state_id = ${stateId} and m.slug = ${marketSlug}
    order by m.id limit 1`);
  return rows.rows[0] ?? null;
}

export async function getMarketSeries(commodityId: number, marketId: number): Promise<PricePoint[]> {
  const rows = await getDb().execute<PricePoint>(sql`
    select arrival_date::text as date, modal_price as value, min_price as min, max_price as max, 1 as markets
    from prices_market_daily
    where commodity_id = ${commodityId} and market_id = ${marketId}
      and arrival_date > (select max(arrival_date) from prices_market_daily where commodity_id = ${commodityId} and market_id = ${marketId}) - 365
    order by arrival_date`);
  return rows.rows;
}

export type MonthlyAverage = {
  month: string; // YYYY-MM-01
  avg: number;
  min: number;
  max: number;
  days: number;
};

/** Monthly averages for a market, from rollups (kept indefinitely) and recent daily data. */
export async function getMarketMonthly(commodityId: number, marketId: number): Promise<MonthlyAverage[]> {
  const rows = await getDb().execute<MonthlyAverage>(sql`
    select month::text as month, avg_modal as avg, min_modal as min, max_modal as max, days_reported as days
    from prices_monthly where commodity_id = ${commodityId} and market_id = ${marketId}
    union all
    select date_trunc('month', arrival_date)::date::text, round(avg(modal_price))::int, min(modal_price), max(modal_price), count(*)::int
    from prices_market_daily
    where commodity_id = ${commodityId} and market_id = ${marketId}
      and date_trunc('month', arrival_date)::date not in (select month from prices_monthly where commodity_id = ${commodityId} and market_id = ${marketId})
    group by 1
    order by 1`);
  return rows.rows;
}

/** First date we hold any price for this crop at this market (for the seasonality note). */
export async function getFirstDataDate(commodityId: number, marketId?: number): Promise<string | null> {
  const rows = await getDb().execute<{ d: string | null }>(sql`
    select least(
      (select min(arrival_date) from prices_market_daily where commodity_id = ${commodityId} ${marketId ? sql`and market_id = ${marketId}` : sql``}),
      (select min(month) from prices_monthly where commodity_id = ${commodityId} ${marketId ? sql`and market_id = ${marketId}` : sql``})
    )::text as d`);
  return rows.rows[0]?.d ?? null;
}
