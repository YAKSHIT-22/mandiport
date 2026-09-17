import { sql } from "drizzle-orm";
import type { Db } from "./index";

/** Read models for the admin pages (SPEC §8.1, §6.3, §6.5, §6.6). */

export const LONG_RUN_MINUTES = 45;

export async function getAdminOverview(db: Db) {
  const [size, counts, runs, rejects, tiers, pending] = await Promise.all([
    db.execute<{ bytes: string }>(sql`select pg_database_size(current_database())::text as bytes`),
    db.execute<Record<string, string>>(sql`
      select (select count(*) from prices_daily)::text as prices_daily,
             (select count(*) from commodities)::text as commodities,
             (select count(*) from markets)::text as markets,
             (select count(*) from exports_annual)::text as exports,
             (select count(*) from msp)::text as msp,
             (select count(*) from alerts where active)::text as active_alerts,
             (select min(arrival_date)::text from prices_daily) as first_date,
             (select max(arrival_date)::text from prices_daily) as last_date`),
    db.execute<{
      id: number;
      job: string;
      status: string;
      started_at: string;
      finished_at: string | null;
      minutes: string | null;
      rows_fetched: number;
      rows_upserted: number;
      rows_rejected: number;
      error: string | null;
      params: Record<string, unknown>;
    }>(sql`
      select id, job, status, started_at::text, finished_at::text,
             round(extract(epoch from (coalesce(finished_at, now()) - started_at)) / 60, 1)::text as minutes,
             rows_fetched, rows_upserted, rows_rejected, error, params
      from ingest_runs order by started_at desc limit 30`),
    db.execute<{ reason: string; n: string }>(sql`
      select reason, count(*)::text as n from ingest_rejects
      where created_at > now() - interval '7 days' group by reason order by count(*) desc limit 15`),
    db.execute<{ tier: number; n: string }>(
      sql`select tier, count(*)::text as n from commodities group by tier order by tier`,
    ),
    db.execute<{ categories: string; mappings: string; drafts: string }>(sql`
      select (select count(*) from commodities where not category_confirmed)::text as categories,
             (select count(*) from crop_mapping where status = 'suggested')::text as mappings,
             (select count(*) from ai_briefs where status = 'draft')::text as drafts`),
  ]);

  const runRows = runs.rows.map((r) => ({
    ...r,
    minutes: r.minutes === null ? null : Number(r.minutes),
    // A "running" row older than two hours was interrupted (killed job / crashed runner).
    interrupted: r.status === "running" && Number(r.minutes) > 120,
  }));
  const jobs = await db.execute<{ job: string; total: string; ok: string }>(sql`
    select job, count(*)::text as total, count(*) filter (where status = 'success')::text as ok
    from ingest_runs where started_at > now() - interval '30 days' group by job order by job`);

  return {
    dbBytes: Number(size.rows[0]?.bytes ?? 0),
    counts: counts.rows[0] ?? {},
    runs: runRows,
    longRuns: runRows.filter((r) => (r.minutes ?? 0) > LONG_RUN_MINUTES),
    rejects: rejects.rows.map((r) => ({ reason: r.reason, count: Number(r.n) })),
    tiers: Object.fromEntries(tiers.rows.map((t) => [t.tier, Number(t.n)])) as Record<number, number>,
    successRates: jobs.rows.map((j) => ({ job: j.job, total: Number(j.total), ok: Number(j.ok) })),
    pending: {
      categories: Number(pending.rows[0]?.categories ?? 0),
      mappings: Number(pending.rows[0]?.mappings ?? 0),
      drafts: Number(pending.rows[0]?.drafts ?? 0),
    },
  };
}

export async function getCategoryReviewQueue(db: Db, limit = 200) {
  const rows = await db.execute<{
    id: number;
    source_name: string;
    display_name: string;
    tier: number;
    markets: number;
    category_id: number | null;
    category_confirmed: boolean;
  }>(sql`
    select id, source_name, display_name, tier, markets_reporting_90d as markets, category_id, category_confirmed
    from commodities where not category_confirmed
    order by tier, markets_reporting_90d desc, display_name limit ${limit}`);
  const categories = await db.execute<{ id: number; name: string; slug: string }>(
    sql`select id, name, slug from categories order by sort_order`,
  );
  return { commodities: rows.rows, categories: categories.rows };
}

export async function getMappingReviewQueue(
  db: Db,
  status: "suggested" | "verified" | "rejected" = "suggested",
  limit = 200,
) {
  const rows = await db.execute<{
    id: number;
    commodity: string;
    commodity_slug: string;
    tier: number;
    export_commodity: string;
    export_key: string;
    confidence: string | null;
    notes: string | null;
    hs_code: string | null;
    status: string;
  }>(sql`
    select m.id, c.display_name as commodity, c.slug as commodity_slug, c.tier,
           e.display_name as export_commodity, e.source_name as export_key,
           m.confidence::text, m.notes, m.hs_code, m.status
    from crop_mapping m
    join commodities c on c.id = m.commodity_id
    join export_commodities e on e.id = m.export_commodity_id
    where m.status = ${status}
    order by c.tier, m.confidence desc nulls last, c.display_name
    limit ${limit}`);
  return rows.rows;
}
