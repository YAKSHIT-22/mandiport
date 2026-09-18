/**
 * Deterministic sample data for end-to-end tests (CI runs against an empty database).
 * Never run against a real database: it refuses unless SEED_E2E=1 is set.
 *
 *   SEED_E2E=1 pnpm db:seed:e2e
 */
import { sql } from "drizzle-orm";
import { recalculateTiers } from "@/lib/tiers";
import { logger, runScript } from "./lib/context";

const AS_OF = "2026-09-16";

runScript("seed-e2e", async ({ db }) => {
  if (process.env.SEED_E2E !== "1") throw new Error("Refusing to seed: set SEED_E2E=1 (test databases only)");

  const existing = await db.execute<{ n: number }>(sql`select count(*)::int as n from prices_daily`);
  if ((existing.rows[0]?.n ?? 0) > 0) {
    logger.info("database already has prices; nothing to seed");
    return;
  }

  await db.execute(
    sql`insert into states (name, slug) values ('Maharashtra', 'maharashtra') on conflict do nothing`,
  );
  await db.execute(sql`
    insert into districts (state_id, name, slug)
    select id, 'Nashik', 'nashik' from states where slug = 'maharashtra' on conflict do nothing`);
  // 60 markets so that one crop reaches Tier 1 and the tier rules are exercised end to end.
  await db.execute(sql`
    insert into markets (district_id, name, slug)
    select d.id, 'Market ' || n, 'market-' || n from districts d, generate_series(1, 60) n
    where d.slug = 'nashik' on conflict do nothing`);
  await db.execute(sql`
    update markets set name = 'Lasalgaon', slug = 'lasalgaon' where slug = 'market-1'`);
  await db.execute(sql`
    insert into commodities (source_name, display_name, slug, category_id, category_confirmed, tier)
    select v.name, v.name, v.slug, (select id from categories where slug = v.category), true, 3
    from (values ('Onion', 'onion', 'vegetables'), ('Tomato', 'tomato', 'vegetables'), ('Lotus', 'lotus', 'flowers')) as v(name, slug, category)
    on conflict do nothing`);
  await db.execute(sql`
    insert into msp (source_name, variety, commodity_id, season, year, msp_price, resource_id)
    select 'Onion', null, id, 'kharif', '2024-25', 2000, 'seed-e2e' from commodities where slug = 'onion'
    on conflict do nothing`);

  // Onion: 60 markets over 90 days → Tier 1. Tomato: 6 markets over 30 days → Tier 2.
  // Lotus: one market, two days → Tier 3, so the "limited data" and noindex tests have a subject.
  await db.execute(sql`
    insert into prices_daily (arrival_date, market_id, commodity_id, variety_id, grade_id, source, min_price, max_price, modal_price)
    select ${AS_OF}::date - d, m.id, c.id, null, null, 2, 2200, 2600, 2400 + (d % 7) * 25 + m.id
    from generate_series(0, 89) d, markets m, commodities c
    where c.slug = 'onion'
    on conflict do nothing`);
  await db.execute(sql`
    insert into prices_daily (arrival_date, market_id, commodity_id, variety_id, grade_id, source, min_price, max_price, modal_price)
    select ${AS_OF}::date - d, m.id, c.id, null, null, 2, 1300, 1700, 1500 + (d % 5) * 20
    from generate_series(0, 29) d, (select id from markets order by id limit 6) m, commodities c
    where c.slug = 'tomato'
    on conflict do nothing`);
  await db.execute(sql`
    insert into prices_daily (arrival_date, market_id, commodity_id, variety_id, grade_id, source, min_price, max_price, modal_price)
    select ${AS_OF}::date - d, (select min(id) from markets), c.id, null, null, 2, 900, 1300, 1100
    from generate_series(0, 1) d, commodities c where c.slug = 'lotus'
    on conflict do nothing`);

  await db.execute(sql`
    insert into prices_market_daily (arrival_date, market_id, commodity_id, state_id, modal_price, min_price, max_price)
    select p.arrival_date, p.market_id, p.commodity_id, d.state_id, p.modal_price, p.min_price, p.max_price
    from prices_daily p join markets m on m.id = p.market_id join districts d on d.id = m.district_id
    on conflict do nothing`);
  await db.execute(sql`
    insert into prices_state_daily (arrival_date, state_id, commodity_id, median_modal, markets_reporting)
    select arrival_date, state_id, commodity_id, round(avg(modal_price))::int, count(*)
    from prices_market_daily group by 1, 2, 3 on conflict do nothing`);
  await db.execute(sql`
    insert into prices_national_daily (arrival_date, commodity_id, median_modal, min_modal, max_modal, markets_reporting, states_reporting)
    select arrival_date, commodity_id, round(avg(modal_price))::int, min(min_price), max(max_price), count(*), count(distinct state_id)
    from prices_market_daily group by 1, 2 on conflict do nothing`);

  const { counts } = await recalculateTiers(db, AS_OF);
  logger.info("seeded e2e data", { tiers: counts });
});
