import { sql } from "drizzle-orm";
import { daysBefore } from "@/lib/dates";
import type { Db } from "@/lib/db";

export { daysBefore };

/** Retention (SPEC §6.3). */
export const RETENTION = {
  pricesDailyDays: 400,
  rejectsDays: 30,
  runsDays: 180,
} as const;

/**
 * Rebuilds weekly (ISO weeks starting Monday) and monthly market rollups for every period
 * that overlaps [from, to], from prices_market_daily. Idempotent.
 */
export async function buildRollups(
  db: Db,
  from: string,
  to: string,
): Promise<{ weekly: number; monthly: number }> {
  return db.transaction(async (tx) => {
    const weekly = await tx.execute(sql`
      insert into prices_weekly (week_start, market_id, commodity_id, avg_modal, min_modal, max_modal, days_reported)
      select date_trunc('week', arrival_date)::date, market_id, commodity_id,
             round(avg(modal_price))::int, min(modal_price), max(modal_price), count(*)
      from prices_market_daily
      where arrival_date >= date_trunc('week', ${from}::date) and arrival_date < date_trunc('week', ${to}::date) + interval '7 days'
      group by 1, 2, 3
      on conflict (commodity_id, market_id, week_start) do update set
        avg_modal = excluded.avg_modal, min_modal = excluded.min_modal, max_modal = excluded.max_modal,
        days_reported = excluded.days_reported, updated_at = now()`);

    const monthly = await tx.execute(sql`
      insert into prices_monthly (month, market_id, commodity_id, avg_modal, min_modal, max_modal, days_reported)
      select date_trunc('month', arrival_date)::date, market_id, commodity_id,
             round(avg(modal_price))::int, min(modal_price), max(modal_price), count(*)
      from prices_market_daily
      where arrival_date >= date_trunc('month', ${from}::date) and arrival_date < date_trunc('month', ${to}::date) + interval '1 month'
      group by 1, 2, 3
      on conflict (commodity_id, market_id, month) do update set
        avg_modal = excluded.avg_modal, min_modal = excluded.min_modal, max_modal = excluded.max_modal,
        days_reported = excluded.days_reported, updated_at = now()`);

    return { weekly: weekly.rowCount ?? 0, monthly: monthly.rowCount ?? 0 };
  });
}

export interface RetentionResult {
  pricesDaily: number;
  marketDaily: number;
  rejects: number;
  runs: number;
}

/**
 * Deletes rows past retention. Rollups for the periods being dropped are rebuilt first so
 * nothing is lost from weekly/monthly history.
 */
export async function applyRetention(db: Db, today: string): Promise<RetentionResult> {
  const cutoff = daysBefore(today, RETENTION.pricesDailyDays);
  // Periods containing the cutoff may be partially deleted; rebuild them from what remains first.
  await buildRollups(db, daysBefore(cutoff, 45), cutoff);

  return db.transaction(async (tx) => {
    const pricesDaily = await tx.execute(sql`delete from prices_daily where arrival_date < ${cutoff}::date`);
    const marketDaily = await tx.execute(
      sql`delete from prices_market_daily where arrival_date < ${cutoff}::date`,
    );
    const rejects = await tx.execute(
      sql`delete from ingest_rejects where created_at < now() - make_interval(days => ${RETENTION.rejectsDays})`,
    );
    const runs = await tx.execute(
      sql`delete from ingest_runs where started_at < now() - make_interval(days => ${RETENTION.runsDays})`,
    );
    return {
      pricesDaily: pricesDaily.rowCount ?? 0,
      marketDaily: marketDaily.rowCount ?? 0,
      rejects: rejects.rowCount ?? 0,
      runs: runs.rowCount ?? 0,
    };
  });
}
