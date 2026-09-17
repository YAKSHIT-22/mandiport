import { sql } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/lib/db";
import { EXPORT_SOURCE, EXPORT_TOTAL_SOURCE } from "@/lib/ingest/exports-job";

export type ExportMapping = {
  exportCommodityId: number;
  exportName: string;
  exportSlug: string;
  status: "suggested" | "verified";
  hsCode: string | null;
};

/**
 * The export counterpart to show for a crop (SPEC §6.6): a verified mapping, else the most
 * confident suggestion (shown with an "Unverified mapping" note). Rejected mappings hide the section.
 */
export const getExportMapping = cache(async (commodityId: number): Promise<ExportMapping | null> => {
  const rows = await getDb().execute<ExportMapping>(sql`
    select e.id as "exportCommodityId", e.display_name as "exportName", e.slug as "exportSlug", m.status, m.hs_code as "hsCode"
    from crop_mapping m join export_commodities e on e.id = m.export_commodity_id
    where m.commodity_id = ${commodityId} and m.status in ('verified', 'suggested')
      and (m.status = 'verified' or m.confidence >= 0.5)
    order by (m.status = 'verified') desc, m.confidence desc nulls last
    limit 1`);
  return rows.rows[0] ?? null;
});

export type ExportYear = {
  year: string;
  valueUsdMillion: number;
  quantity: number | null;
  unit: string | null;
};

export type CountryExport = {
  country: string;
  valueUsdMillion: number;
  previousValueUsdMillion: number | null;
  quantity: number | null;
  unit: string | null;
};

export async function getExportYears(exportCommodityId: number): Promise<ExportYear[]> {
  const rows = await getDb().execute<{
    year: string;
    value: string;
    quantity: string | null;
    unit: string | null;
  }>(sql`
    select year, value_usd_million::text as value, quantity::text, unit
    from exports_annual where export_commodity_id = ${exportCommodityId} and source = ${EXPORT_TOTAL_SOURCE}
    order by year`);
  return rows.rows.map((r) => ({
    year: r.year,
    valueUsdMillion: Number(r.value),
    quantity: r.quantity === null ? null : Number(r.quantity),
    unit: r.unit,
  }));
}

/** Countries for one year, ranked by value, with the previous available year's value for growth. */
export async function getExportCountries(
  exportCommodityId: number,
  year: string,
  limit = 50,
): Promise<CountryExport[]> {
  const rows = await getDb().execute<{
    country: string;
    value: string;
    prev: string | null;
    quantity: string | null;
    unit: string | null;
  }>(sql`
    with prev_year as (
      select max(year) as y from exports_annual
      where export_commodity_id = ${exportCommodityId} and source = ${EXPORT_SOURCE} and year < ${year}
    )
    select c.display_name as country, cur.value_usd_million::text as value, p.value_usd_million::text as prev,
           cur.quantity::text, cur.unit
    from exports_annual cur
    join countries c on c.id = cur.country_id
    left join exports_annual p on p.export_commodity_id = cur.export_commodity_id and p.country_id = cur.country_id
      and p.source = ${EXPORT_SOURCE} and p.year = (select y from prev_year)
    where cur.export_commodity_id = ${exportCommodityId} and cur.source = ${EXPORT_SOURCE} and cur.year = ${year}
      and cur.value_usd_million > 0
    order by cur.value_usd_million desc
    limit ${limit}`);
  return rows.rows.map((r) => ({
    country: r.country,
    valueUsdMillion: Number(r.value),
    previousValueUsdMillion: r.prev === null ? null : Number(r.prev),
    quantity: r.quantity === null ? null : Number(r.quantity),
    unit: r.unit,
  }));
}

export async function getLatestExportYear(): Promise<string | null> {
  const rows = await getDb().execute<{ y: string | null }>(sql`select max(year) as y from exports_annual`);
  return rows.rows[0]?.y ?? null;
}
