import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { formatDataDate } from "@/lib/dates";

/**
 * The only data the model can see (SPEC §8.7). Every function is a fixed, parameterized,
 * read-only query. The model never writes SQL and never sees the database directly.
 * Crop, state and market names are resolved by fuzzy matching against the database.
 */

export type ToolResult = Record<string, unknown>;

async function resolveCrop(name: string) {
  const rows = await getDb().execute<{ id: number; slug: string; name: string; tier: number }>(sql`
    select id, slug, display_name as name, tier from commodities
    where lower(display_name) = lower(${name}) or lower(source_name) = lower(${name}) or slug = lower(${name})
       or similarity(lower(display_name), lower(${name})) > 0.4
    order by (lower(display_name) = lower(${name})) desc, similarity(lower(display_name), lower(${name})) desc, tier
    limit 1`);
  return rows.rows[0] ?? null;
}

async function resolveState(name: string) {
  const rows = await getDb().execute<{ id: number; slug: string; name: string }>(sql`
    select id, slug, name from states
    where lower(name) = lower(${name}) or slug = lower(${name}) or similarity(lower(name), lower(${name})) > 0.4
    order by similarity(lower(name), lower(${name})) desc limit 1`);
  return rows.rows[0] ?? null;
}

async function resolveMarket(name: string, stateId?: number) {
  const rows = await getDb().execute<{
    id: number;
    name: string;
    slug: string;
    state: string;
    stateSlug: string;
  }>(sql`
    select m.id, m.name, m.slug, s.name as state, s.slug as "stateSlug"
    from markets m join districts d on d.id = m.district_id join states s on s.id = d.state_id
    where (lower(m.name) = lower(${name}) or similarity(lower(m.name), lower(${name})) > 0.4)
      ${stateId ? sql`and s.id = ${stateId}` : sql``}
    order by (lower(m.name) = lower(${name})) desc, similarity(lower(m.name), lower(${name})) desc limit 1`);
  return rows.rows[0] ?? null;
}

const notFound = (what: string, name: string) => ({
  error: `No ${what} named "${name}" was found in the data.`,
});

export const aiToolSchemas = {
  list_crops: z.object({ query: z.string().trim().max(60).optional() }),
  get_latest_prices: z.object({
    crop: z.string().trim().min(1).max(80),
    state: z.string().trim().max(80).optional(),
    market: z.string().trim().max(80).optional(),
  }),
  get_price_trend: z.object({
    crop: z.string().trim().min(1).max(80),
    state: z.string().trim().max(80).optional(),
    market: z.string().trim().max(80).optional(),
    days: z.number().int().min(7).max(365),
  }),
  compare_markets: z.object({
    crop: z.string().trim().min(1).max(80),
    state: z.string().trim().min(1).max(80),
    limit: z.number().int().min(1).max(20).default(10),
  }),
  get_msp: z.object({ crop: z.string().trim().min(1).max(80) }),
  get_export_summary: z.object({
    crop: z.string().trim().min(1).max(80),
    years: z.number().int().min(1).max(10).default(5),
  }),
  get_top_destinations: z.object({
    crop: z.string().trim().min(1).max(80),
    year: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional(),
  }),
};

export const aiToolImplementations = {
  async list_crops({ query }: z.infer<typeof aiToolSchemas.list_crops>): Promise<ToolResult> {
    const rows = await getDb().execute<{ name: string; tier: number; markets: number }>(sql`
      select display_name as name, tier, markets_reporting_90d as markets from commodities
      where markets_reporting_90d > 0 ${query ? sql`and lower(display_name) like ${`%${query.toLowerCase()}%`}` : sql``}
      order by tier, markets_reporting_90d desc limit 60`);
    return { crops: rows.rows.map((r) => ({ name: r.name, markets_reporting_90d: r.markets })) };
  },

  async get_latest_prices({
    crop,
    state,
    market,
  }: z.infer<typeof aiToolSchemas.get_latest_prices>): Promise<ToolResult> {
    const c = await resolveCrop(crop);
    if (!c) return notFound("crop", crop);
    const s = state ? await resolveState(state) : null;
    if (state && !s) return notFound("state", state);
    const m = market ? await resolveMarket(market, s?.id) : null;
    if (market && !m) return notFound("market", market);

    if (m) {
      const rows = await getDb().execute<{ date: string; modal: number; min: number; max: number }>(sql`
        select arrival_date::text as date, modal_price as modal, min_price as min, max_price as max
        from prices_market_daily where commodity_id = ${c.id} and market_id = ${m.id}
        order by arrival_date desc limit 1`);
      const row = rows.rows[0];
      return row
        ? {
            crop: c.name,
            market: m.name,
            state: m.state,
            date: formatDataDate(row.date),
            modal_price_per_quintal: row.modal,
            min_price: row.min,
            max_price: row.max,
          }
        : { crop: c.name, market: m.name, note: "No prices reported at this market in the data we hold." };
    }
    if (s) {
      const rows = await getDb().execute<{ date: string; median: number; markets: number }>(sql`
        select arrival_date::text as date, median_modal as median, markets_reporting as markets
        from prices_state_daily where commodity_id = ${c.id} and state_id = ${s.id} order by arrival_date desc limit 1`);
      const row = rows.rows[0];
      return row
        ? {
            crop: c.name,
            state: s.name,
            date: formatDataDate(row.date),
            median_modal_price_per_quintal: row.median,
            markets_reporting: row.markets,
          }
        : { crop: c.name, state: s.name, note: "No prices reported in this state in the data we hold." };
    }
    const rows = await getDb().execute<{
      date: string;
      median: number;
      min: number;
      max: number;
      markets: number;
      states: number;
    }>(sql`
      select arrival_date::text as date, median_modal as median, min_modal as min, max_modal as max,
             markets_reporting as markets, states_reporting as states
      from prices_national_daily where commodity_id = ${c.id} order by arrival_date desc limit 1`);
    const row = rows.rows[0];
    return row
      ? {
          crop: c.name,
          scope: "India",
          date: formatDataDate(row.date),
          national_median_modal_price_per_quintal: row.median,
          lowest_market_price: row.min,
          highest_market_price: row.max,
          markets_reporting: row.markets,
          states_reporting: row.states,
        }
      : { crop: c.name, note: "No prices reported for this crop in the data we hold." };
  },

  async get_price_trend({
    crop,
    state,
    market,
    days,
  }: z.infer<typeof aiToolSchemas.get_price_trend>): Promise<ToolResult> {
    const c = await resolveCrop(crop);
    if (!c) return notFound("crop", crop);
    const s = state ? await resolveState(state) : null;
    if (state && !s) return notFound("state", state);
    const m = market ? await resolveMarket(market, s?.id) : null;
    if (market && !m) return notFound("market", market);

    const rows = m
      ? await getDb().execute<{ date: string; price: number }>(sql`
          select arrival_date::text as date, modal_price as price from prices_market_daily
          where commodity_id = ${c.id} and market_id = ${m.id}
            and arrival_date > (select max(arrival_date) from prices_market_daily where commodity_id = ${c.id} and market_id = ${m.id}) - ${days}::int
          order by arrival_date`)
      : s
        ? await getDb().execute<{ date: string; price: number }>(sql`
            select arrival_date::text as date, median_modal as price from prices_state_daily
            where commodity_id = ${c.id} and state_id = ${s.id}
              and arrival_date > (select max(arrival_date) from prices_state_daily where commodity_id = ${c.id} and state_id = ${s.id}) - ${days}::int
            order by arrival_date`)
        : await getDb().execute<{ date: string; price: number }>(sql`
            select arrival_date::text as date, median_modal as price from prices_national_daily
            where commodity_id = ${c.id}
              and arrival_date > (select max(arrival_date) from prices_national_daily where commodity_id = ${c.id}) - ${days}::int
            order by arrival_date`);

    const points = rows.rows;
    if (points.length === 0) return { crop: c.name, note: "No price history in this period." };
    const first = points[0]!;
    const last = points.at(-1)!;
    const lowest = points.reduce((a, b) => (b.price < a.price ? b : a));
    const highest = points.reduce((a, b) => (b.price > a.price ? b : a));
    return {
      crop: c.name,
      scope: m ? `${m.name}, ${m.state}` : (s?.name ?? "India"),
      period_days: days,
      days_with_data: points.length,
      first: { date: formatDataDate(first.date), price_per_quintal: first.price },
      latest: { date: formatDataDate(last.date), price_per_quintal: last.price },
      lowest: { date: formatDataDate(lowest.date), price_per_quintal: lowest.price },
      highest: { date: formatDataDate(highest.date), price_per_quintal: highest.price },
      change_over_period: last.price - first.price,
    };
  },

  async compare_markets({
    crop,
    state,
    limit,
  }: z.infer<typeof aiToolSchemas.compare_markets>): Promise<ToolResult> {
    const c = await resolveCrop(crop);
    if (!c) return notFound("crop", crop);
    const s = await resolveState(state);
    if (!s) return notFound("state", state);
    const rows = await getDb().execute<{ market: string; district: string; date: string; modal: number }>(sql`
      with latest as (
        select distinct on (pm.market_id) pm.market_id, pm.arrival_date, pm.modal_price
        from prices_market_daily pm
        where pm.commodity_id = ${c.id} and pm.state_id = ${s.id}
          and pm.arrival_date > (select max(arrival_date) from prices_market_daily where commodity_id = ${c.id}) - 30
        order by pm.market_id, pm.arrival_date desc
      )
      select m.name as market, d.name as district, l.arrival_date::text as date, l.modal_price as modal
      from latest l join markets m on m.id = l.market_id join districts d on d.id = m.district_id
      order by l.modal_price desc limit ${limit}`);
    return rows.rows.length === 0
      ? {
          crop: c.name,
          state: s.name,
          note: "No market in this state reported this crop in the last 30 days.",
        }
      : {
          crop: c.name,
          state: s.name,
          markets: rows.rows.map((r) => ({
            market: r.market,
            district: r.district,
            date: formatDataDate(r.date),
            modal_price_per_quintal: r.modal,
          })),
        };
  },

  async get_msp({ crop }: z.infer<typeof aiToolSchemas.get_msp>): Promise<ToolResult> {
    const c = await resolveCrop(crop);
    if (!c) return notFound("crop", crop);
    const rows = await getDb().execute<{
      name: string;
      variety: string | null;
      season: string;
      year: string;
      price: number;
    }>(sql`
      select source_name as name, variety, season, year, msp_price as price from msp
      where commodity_id = ${c.id} order by year desc limit 4`);
    return rows.rows.length === 0
      ? { crop: c.name, note: "No minimum support price is published for this crop." }
      : {
          crop: c.name,
          msp: rows.rows.map((r) => ({
            published_name: r.name,
            variety: r.variety,
            season: r.season,
            marketing_season_year: r.year,
            msp_per_quintal: r.price,
          })),
        };
  },

  async get_export_summary({
    crop,
    years,
  }: z.infer<typeof aiToolSchemas.get_export_summary>): Promise<ToolResult> {
    const c = await resolveCrop(crop);
    if (!c) return notFound("crop", crop);
    const rows = await getDb().execute<{
      group: string;
      verified: boolean;
      year: string;
      value: string;
      quantity: string | null;
      unit: string | null;
    }>(sql`
      select e.display_name as "group", (m.status = 'verified') as verified, a.year, a.value_usd_million::text as value,
             a.quantity::text as quantity, a.unit
      from crop_mapping m
      join export_commodities e on e.id = m.export_commodity_id
      join exports_annual a on a.export_commodity_id = e.id and a.country_id is null
      where m.commodity_id = ${c.id} and m.status in ('verified', 'suggested')
      order by a.year desc limit ${years}`);
    if (rows.rows.length === 0) return { crop: c.name, note: "No export data is mapped to this crop." };
    return {
      crop: c.name,
      export_group: rows.rows[0]!.group,
      mapping_reviewed: rows.rows[0]!.verified,
      note: "Export figures are annual, by broad commodity group, in US$ million, and published with a lag.",
      years: rows.rows.map((r) => ({
        year: r.year,
        value_usd_million: Number(r.value),
        quantity: r.quantity === null ? null : Number(r.quantity),
        unit: r.unit,
      })),
    };
  },

  async get_top_destinations({
    crop,
    year,
  }: z.infer<typeof aiToolSchemas.get_top_destinations>): Promise<ToolResult> {
    const c = await resolveCrop(crop);
    if (!c) return notFound("crop", crop);
    const rows = await getDb().execute<{ group: string; year: string; country: string; value: string }>(sql`
      with mapped as (
        select e.id, e.display_name as name from crop_mapping m join export_commodities e on e.id = m.export_commodity_id
        where m.commodity_id = ${c.id} and m.status in ('verified', 'suggested')
        order by (m.status = 'verified') desc, m.confidence desc nulls last limit 1
      ),
      chosen as (
        select coalesce(${year ?? null}, (select max(year) from exports_annual a, mapped where a.export_commodity_id = mapped.id)) as y
      )
      select mapped.name as "group", a.year, c2.display_name as country, a.value_usd_million::text as value
      from exports_annual a, mapped, chosen
      join countries c2 on c2.id = a.country_id
      where a.export_commodity_id = mapped.id and a.year = chosen.y and a.country_id is not null
      order by a.value_usd_million desc limit 10`);
    return rows.rows.length === 0
      ? { crop: c.name, note: "No export destinations are available for this crop." }
      : {
          crop: c.name,
          export_group: rows.rows[0]!.group,
          year: rows.rows[0]!.year,
          destinations: rows.rows.map((r) => ({ country: r.country, value_usd_million: Number(r.value) })),
        };
  },
};

export type AiToolName = keyof typeof aiToolImplementations;
export const AI_TOOL_NAMES = Object.keys(aiToolImplementations) as AiToolName[];
