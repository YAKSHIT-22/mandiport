import { sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { formatDataDate } from "@/lib/dates";
import { formatRupees } from "@/lib/format";

/** Alert matching (SPEC §8.9). At most one message per alert per day. */

export type TriggeredAlert = {
  id: number;
  chatId: string;
  crop: string;
  cropSlug: string;
  place: string;
  direction: "above" | "below";
  threshold: number;
  price: number;
  date: string;
  markets: number;
};

export async function findTriggeredAlerts(db: Db, today: string): Promise<TriggeredAlert[]> {
  const rows = await db.execute<TriggeredAlert>(sql`
    with national as (
      select distinct on (commodity_id) commodity_id, arrival_date, median_modal, markets_reporting
      from prices_national_daily order by commodity_id, arrival_date desc
    ),
    state_latest as (
      select distinct on (commodity_id, state_id) commodity_id, state_id, arrival_date, median_modal, markets_reporting
      from prices_state_daily order by commodity_id, state_id, arrival_date desc
    )
    select a.id, a.telegram_chat_id as "chatId", c.display_name as crop, c.slug as "cropSlug",
           coalesce(s.name, 'India') as place, a.direction, a.threshold,
           coalesce(sl.median_modal, n.median_modal) as price,
           coalesce(sl.arrival_date, n.arrival_date)::text as date,
           coalesce(sl.markets_reporting, n.markets_reporting) as markets
    from alerts a
    join commodities c on c.id = a.commodity_id
    left join states s on s.id = a.state_id
    left join national n on n.commodity_id = a.commodity_id and a.state_id is null
    left join state_latest sl on sl.commodity_id = a.commodity_id and sl.state_id = a.state_id
    where a.active
      and (a.last_triggered_on is null or a.last_triggered_on < ${today}::date)
      and coalesce(sl.median_modal, n.median_modal) is not null
      -- Only act on data from the last three days, so an old price cannot fire an alert.
      and coalesce(sl.arrival_date, n.arrival_date) > ${today}::date - 3
      and (
        (a.direction = 'above' and coalesce(sl.median_modal, n.median_modal) >= a.threshold)
        or (a.direction = 'below' and coalesce(sl.median_modal, n.median_modal) <= a.threshold)
      )`);
  return rows.rows;
}

export function alertMessage(alert: TriggeredAlert, siteUrl: string): string {
  return [
    `${alert.crop} in ${alert.place}: ${formatRupees(alert.price)} per quintal`,
    `That is ${alert.direction} your alert level of ${formatRupees(alert.threshold)}.`,
    `Median of ${alert.markets} market${alert.markets === 1 ? "" : "s"} reporting on ${formatDataDate(alert.date)}.`,
    "",
    `${siteUrl}/crops/${alert.cropSlug}`,
    "Prices may have changed since that date. Send /stop to remove your alerts.",
  ].join("\n");
}

export async function markAlertSent(db: Db, alertId: number, today: string): Promise<void> {
  await db.execute(
    sql`update alerts set last_triggered_on = ${today}::date, updated_at = now() where id = ${alertId}`,
  );
}
