import { sql } from "drizzle-orm";
import type { Db } from "@/lib/db";

/**
 * Derived daily tables, recomputed for whole dates after each ingest (SPEC §6.7 "refresh
 * prices_state_daily for affected dates").
 *
 * - prices_market_daily: one price per market/commodity/day = median modal across that
 *   market's variety and grade rows; min/max across them.
 * - prices_state_daily: median of market prices in the state; markets reporting.
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
    await tx.execute(sql`delete from prices_market_daily where arrival_date in (${dateList})`);
    await tx.execute(sql`
      insert into prices_market_daily (arrival_date, market_id, commodity_id, state_id, modal_price, min_price, max_price)
      select p.arrival_date, p.market_id, p.commodity_id, d.state_id,
             round(percentile_cont(0.5) within group (order by p.modal_price))::int,
             min(p.min_price), max(p.max_price)
      from prices_daily p
      join markets m on m.id = p.market_id
      join districts d on d.id = m.district_id
      where p.arrival_date in (${dateList})
      group by p.arrival_date, p.market_id, p.commodity_id, d.state_id`);

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
