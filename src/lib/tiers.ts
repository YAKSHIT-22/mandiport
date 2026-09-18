import { sql } from "drizzle-orm";
import { TIER_CONFIG, tierFor, type Tier } from "@/config/tiers";
import type { Db } from "@/lib/db";

export interface TierChange {
  commodityId: number;
  name: string;
  from: Tier;
  to: Tier;
}

/**
 * Recalculates every commodity's tier from the last 90 days of market-level data, ending at
 * `asOf` (SPEC §6.4). Logs changes to tier_changes.
 */
export async function recalculateTiers(
  db: Db,
  asOf: string,
): Promise<{ counts: Record<Tier, number>; changes: TierChange[] }> {
  const windowStart = sql`(${asOf}::date - ${TIER_CONFIG.windowDays - 1}::int)`;
  const stats = await db.execute<{
    id: number;
    display_name: string;
    tier: number;
    markets: number;
    days: number;
  }>(sql`
    select c.id, c.display_name, c.tier,
           coalesce(count(distinct p.market_id), 0)::int as markets,
           coalesce(count(distinct p.arrival_date), 0)::int as days
    from commodities c
    left join prices_daily p
      on p.commodity_id = c.id and p.arrival_date between ${windowStart} and ${asOf}::date
    group by c.id`);

  const counts: Record<Tier, number> = { 1: 0, 2: 0, 3: 0 };
  const changes: TierChange[] = [];

  await db.transaction(async (tx) => {
    for (const row of stats.rows) {
      const tier = tierFor(row.markets, row.days);
      counts[tier]++;
      if (tier !== row.tier) {
        changes.push({ commodityId: row.id, name: row.display_name, from: row.tier as Tier, to: tier });
        await tx.execute(
          sql`insert into tier_changes (commodity_id, from_tier, to_tier) values (${row.id}, ${row.tier}, ${tier})`,
        );
      }
      await tx.execute(sql`
        update commodities set tier = ${tier}, markets_reporting_90d = ${row.markets},
          days_reported_90d = ${row.days}, tier_updated_at = now(), updated_at = now()
        where id = ${row.id}`);
    }
  });

  return { counts, changes };
}
