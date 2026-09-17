import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { applyRetention, buildRollups, daysBefore } from "@/lib/ingest/rollups";
import { recalculateTiers } from "@/lib/tiers";
import { closeTestDb, resetDb, testDb } from "../helpers/db";

async function seedDims(marketCount: number) {
  const db = testDb();
  await db.execute(sql`insert into states (name, slug) values ('Punjab', 'punjab')`);
  await db.execute(sql`insert into districts (state_id, name, slug) values (1, 'Ludhiana', 'ludhiana')`);
  for (let i = 1; i <= marketCount; i++) {
    await db.execute(
      sql`insert into markets (district_id, name, slug) values (1, ${`Market ${i}`}, ${`market-${i}`})`,
    );
  }
  await db.execute(
    sql`insert into commodities (source_name, display_name, slug) values ('Wheat', 'Wheat', 'wheat'), ('Onion', 'Onion', 'onion'), ('Lotus', 'Lotus', 'lotus')`,
  );
}

async function marketDaily(date: string, marketId: number, commodityId: number, modal: number) {
  await testDb().execute(sql`
    insert into prices_market_daily (arrival_date, market_id, commodity_id, state_id, modal_price, min_price, max_price)
    values (${date}, ${marketId}, ${commodityId}, 1, ${modal}, ${modal - 50}, ${modal + 50})`);
  await testDb().execute(sql`
    insert into prices_daily (arrival_date, market_id, commodity_id, source, min_price, max_price, modal_price)
    values (${date}, ${marketId}, ${commodityId}, 2, ${modal - 50}, ${modal + 50}, ${modal})`);
}

describe("rollups", () => {
  beforeEach(async () => {
    await resetDb();
    await seedDims(1);
  });
  afterAll(closeTestDb);

  it("computes weekly and monthly averages, ranges and days reported", async () => {
    // Monday 2026-08-31 week: 3 days. Next week: 1 day (Monday 2026-09-07).
    await marketDaily("2026-08-31", 1, 1, 2000);
    await marketDaily("2026-09-01", 1, 1, 2100);
    await marketDaily("2026-09-02", 1, 1, 2201);
    await marketDaily("2026-09-07", 1, 1, 2400);

    const counts = await buildRollups(testDb(), "2026-08-31", "2026-09-07");
    expect(counts).toEqual({ weekly: 2, monthly: 2 });

    const weekly = await testDb().execute(
      sql`select week_start::text, avg_modal, min_modal, max_modal, days_reported from prices_weekly order by week_start`,
    );
    expect(weekly.rows).toEqual([
      { week_start: "2026-08-31", avg_modal: 2100, min_modal: 2000, max_modal: 2201, days_reported: 3 },
      { week_start: "2026-09-07", avg_modal: 2400, min_modal: 2400, max_modal: 2400, days_reported: 1 },
    ]);
    const monthly = await testDb().execute(
      sql`select month::text, avg_modal, days_reported from prices_monthly order by month`,
    );
    expect(monthly.rows).toEqual([
      { month: "2026-08-01", avg_modal: 2000, days_reported: 1 },
      { month: "2026-09-01", avg_modal: 2234, days_reported: 3 },
    ]);

    // Idempotent.
    await buildRollups(testDb(), "2026-08-31", "2026-09-07");
    expect((await testDb().execute(sql`select count(*)::int as n from prices_weekly`)).rows[0]).toEqual({
      n: 2,
    });
  });

  it("keeps 400 days of daily prices and rolls older data up before deleting it", async () => {
    const today = "2026-09-17";
    const old = daysBefore(today, 401);
    const recent = daysBefore(today, 10);
    await marketDaily(old, 1, 1, 1500);
    await marketDaily(recent, 1, 1, 2500);

    const result = await applyRetention(testDb(), today);
    expect(result.pricesDaily).toBe(1);
    expect(result.marketDaily).toBe(1);
    const remaining = await testDb().execute(sql`select arrival_date::text from prices_daily`);
    expect(remaining.rows).toEqual([{ arrival_date: recent }]);
    const monthly = await testDb().execute(
      sql`select avg_modal from prices_monthly where month = date_trunc('month', ${old}::date)`,
    );
    expect(monthly.rows).toEqual([{ avg_modal: 1500 }]);
  });
});

describe("tiers", () => {
  beforeEach(async () => {
    await resetDb();
    await seedDims(60);
  });
  afterAll(closeTestDb);

  it("assigns tiers from markets and reporting days in the last 90 days and logs changes", async () => {
    const asOf = "2026-09-16";
    const db = testDb();
    // Wheat: 60 markets over 65 days → tier 1.
    await db.execute(sql`
      insert into prices_market_daily (arrival_date, market_id, commodity_id, state_id, modal_price, min_price, max_price)
      select ${asOf}::date - d, m, 1, 1, 2000, 1900, 2100
      from generate_series(0, 64) d, generate_series(1, 60) m`);
    // Onion: 6 markets over 25 days → tier 2.
    await db.execute(sql`
      insert into prices_market_daily (arrival_date, market_id, commodity_id, state_id, modal_price, min_price, max_price)
      select ${asOf}::date - d, m, 2, 1, 1500, 1400, 1600
      from generate_series(0, 24) d, generate_series(1, 6) m`);
    // Lotus: 2 markets, plus old data outside the window → tier 3.
    await db.execute(sql`
      insert into prices_market_daily (arrival_date, market_id, commodity_id, state_id, modal_price, min_price, max_price)
      values (${asOf}, 1, 3, 1, 100, 90, 110), (${asOf}, 2, 3, 1, 100, 90, 110), ('2026-01-01', 3, 3, 1, 100, 90, 110)`);

    const { counts, changes } = await recalculateTiers(db, asOf);
    expect(counts).toEqual({ 1: 1, 2: 1, 3: 1 });
    expect(changes.map((c) => [c.name, c.from, c.to])).toEqual(
      expect.arrayContaining([
        ["Wheat", 3, 1],
        ["Onion", 3, 2],
      ]),
    );
    const rows = await db.execute(
      sql`select source_name, tier, markets_reporting_90d, days_reported_90d from commodities order by id`,
    );
    expect(rows.rows).toEqual([
      { source_name: "Wheat", tier: 1, markets_reporting_90d: 60, days_reported_90d: 65 },
      { source_name: "Onion", tier: 2, markets_reporting_90d: 6, days_reported_90d: 25 },
      { source_name: "Lotus", tier: 3, markets_reporting_90d: 2, days_reported_90d: 1 },
    ]);
    expect((await db.execute(sql`select count(*)::int as n from tier_changes`)).rows[0]).toEqual({ n: 2 });

    // No changes on a second run.
    expect((await recalculateTiers(db, asOf)).changes).toEqual([]);
  });
});
