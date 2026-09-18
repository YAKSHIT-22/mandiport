import { sql } from "drizzle-orm";
import type { Db } from "@/lib/db";

/**
 * Derived daily tables, recomputed for whole dates after each ingest (SPEC §6.7).
 *
 * Market-level prices are a view over prices_daily (see schema), so only the state and
 * national medians are stored:
 * - prices_state_daily: median of the market prices in the state; markets reporting.
 * - prices_national_daily: median of all market prices; min/max; markets and states reporting.
 *
 * Medians are percentile_cont(0.5) rounded to whole rupees.
 */
export async function refreshDailyAggregates(db: Db, dates: string[]): Promise<void> {
  if (dates.length === 0) return;
  const dateList = sql`${sql.join(
    dates.map((d) => sql`${d}::date`),
    sql`, `,
  )}`;

  await db.transaction(async (tx) => {
    await tx.execute(sql`delete from prices_state_daily where arrival_date in (${dateList})`);
    await tx.execute(sql`
      insert into prices_state_daily (arrival_date, state_id, commodity_id, median_modal, markets_reporting)
      select arrival_date, state_id, commodity_id,
             round(percentile_cont(0.5) within group (order by modal_price))::int, count(*)
      from prices_market_daily
      where arrival_date in (${dateList})
      group by arrival_date, state_id, commodity_id`);

    await tx.execute(sql`delete from prices_national_daily where arrival_date in (${dateList})`);
    await tx.execute(sql`
      insert into prices_national_daily (arrival_date, commodity_id, median_modal, min_modal, max_modal, markets_reporting, states_reporting)
      select arrival_date, commodity_id,
             round(percentile_cont(0.5) within group (order by modal_price))::int,
             min(modal_price), max(modal_price), count(*), count(distinct state_id)
      from prices_market_daily
      where arrival_date in (${dateList})
      group by arrival_date, commodity_id`);
  });
}
