import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import type { MandiCandidate } from "@/lib/tools/best-mandi";

/** Queries behind the tools (SPEC §8.3–§8.6). */

export type CropOption = { slug: string; name: string; tier: number };

export async function getCropOptions(): Promise<CropOption[]> {
  const rows = await getDb().execute<CropOption>(sql`
    select slug, display_name as name, tier from commodities
    where markets_reporting_90d > 0 order by tier, lower(display_name)`);
  return rows.rows;
}

export type StateOption = { slug: string; name: string };

export async function getStateOptions(cropSlug?: string): Promise<StateOption[]> {
  const rows = await getDb().execute<StateOption>(sql`
    select distinct s.slug, s.name from states s
    join prices_state_daily sd on sd.state_id = s.id
    join commodities c on c.id = sd.commodity_id
    where sd.arrival_date > current_date - 120 ${cropSlug ? sql`and c.slug = ${cropSlug}` : sql``}
    order by s.name`);
  return rows.rows;
}

export type MarketOption = { slug: string; name: string; district: string };

export async function getMarketOptions(cropSlug: string, stateSlug: string): Promise<MarketOption[]> {
  const rows = await getDb().execute<MarketOption>(sql`
    select distinct m.slug, m.name, d.name as district
    from prices_market_daily pm
    join markets m on m.id = pm.market_id
    join districts d on d.id = m.district_id
    join states s on s.id = d.state_id
    join commodities c on c.id = pm.commodity_id
    where c.slug = ${cropSlug} and s.slug = ${stateSlug} and pm.arrival_date > current_date - 180
    order by m.name`);
  return rows.rows;
}

/** Markets that reported this crop in the last `days` days, with coordinates when known. */
export async function getBestMandiCandidates(cropSlug: string, days = 7): Promise<MandiCandidate[]> {
  const rows = await getDb().execute<MandiCandidate>(sql`
    with latest as (
      select distinct on (pm.market_id) pm.market_id, pm.arrival_date, pm.modal_price
      from prices_market_daily pm
      join commodities c on c.id = pm.commodity_id
      where c.slug = ${cropSlug}
        and pm.arrival_date > (select max(arrival_date) from prices_market_daily) - ${days}::int
      order by pm.market_id, pm.arrival_date desc
    )
    select l.market_id as "marketId", m.name as "marketName", m.slug as "marketSlug", d.name as district,
           s.name as "stateName", s.slug as "stateSlug", ${cropSlug} as "cropSlug",
           l.modal_price as "modalPrice", l.arrival_date::text as date, m.lat, m.lng
    from latest l
    join markets m on m.id = l.market_id
    join districts d on d.id = m.district_id
    join states s on s.id = d.state_id
    order by l.modal_price desc`);
  return rows.rows;
}

export async function saveMarketCoordinates(
  marketId: number,
  lat: number,
  lng: number,
  confidence: "high" | "low",
): Promise<void> {
  await getDb().execute(sql`
    update markets set lat = ${lat}, lng = ${lng}, geocode_confidence = ${confidence}, geocoded_at = now(), updated_at = now()
    where id = ${marketId}`);
}

export async function markGeocodeFailed(marketId: number): Promise<void> {
  await getDb().execute(sql`
    update markets set geocode_confidence = 'failed', geocoded_at = now(), updated_at = now() where id = ${marketId}`);
}

export type MspComparison = {
  stateSlug: string;
  stateName: string;
  median: number;
  date: string;
  markets: number;
};

export async function getMspComparison(cropSlug: string): Promise<MspComparison[]> {
  const rows = await getDb().execute<MspComparison>(sql`
    with commodity as (select id from commodities where slug = ${cropSlug}),
    latest as (
      select distinct on (sd.state_id) sd.state_id, sd.arrival_date, sd.median_modal, sd.markets_reporting
      from prices_state_daily sd, commodity
      where sd.commodity_id = commodity.id and sd.arrival_date > current_date - 45
      order by sd.state_id, sd.arrival_date desc
    )
    select s.slug as "stateSlug", s.name as "stateName", l.median_modal as median,
           l.arrival_date::text as date, l.markets_reporting as markets
    from latest l join states s on s.id = l.state_id
    order by l.median_modal desc`);
  return rows.rows;
}

export type ExportCropOption = { slug: string; name: string; exportName: string; verified: boolean };

/** Crops that have an export mapping, for the export destinations tool. */
export async function getExportCropOptions(): Promise<ExportCropOption[]> {
  const rows = await getDb().execute<ExportCropOption>(sql`
    select distinct on (c.slug) c.slug, c.display_name as name, e.display_name as "exportName",
           (m.status = 'verified') as verified
    from crop_mapping m
    join commodities c on c.id = m.commodity_id
    join export_commodities e on e.id = m.export_commodity_id
    where m.status in ('verified', 'suggested') and (m.status = 'verified' or m.confidence >= 0.5)
    order by c.slug, (m.status = 'verified') desc, m.confidence desc nulls last`);
  return rows.rows;
}
