import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { DataGovInClient } from "@/lib/datagovin";
import { runMandiJob } from "@/lib/ingest/mandi-job";
import { closeTestDb, resetDb, testDb } from "../helpers/db";
import { createFakeApi, noSleep } from "../helpers/fake-datagovin";

const RESOURCE = "35985678-0d79-46b4-9ed6-6f13308a1d24";
const logger = { info: () => {}, warn: () => {} };

type Row = Record<string, unknown>;

/** Variety-wise style rows (capitalised keys, as the real resource returns). */
function varietyRow(p: {
  state: string;
  district: string;
  market: string;
  commodity: string;
  modal: number;
  date?: string;
  variety?: string;
  grade?: string;
}): Row {
  return {
    Arrival_Date: p.date ?? "16/09/2026",
    State: p.state,
    District: p.district,
    Market: p.market,
    Commodity: p.commodity,
    Commodity_Code: "1",
    Variety: p.variety ?? "Other",
    Grade: p.grade ?? "FAQ",
    Min_Price: String(p.modal - 100),
    Max_Price: String(p.modal + 100),
    Modal_Price: String(p.modal),
  };
}

function dailyRow(p: Parameters<typeof varietyRow>[0]): Row {
  return {
    state: p.state,
    district: p.district,
    market: p.market,
    commodity: p.commodity,
    variety: p.variety ?? "Other",
    grade: p.grade ?? "FAQ",
    arrival_date: p.date ?? "16/09/2026",
    min_price: p.modal - 100,
    max_price: p.modal + 100,
    modal_price: p.modal,
  };
}

const base = [
  { state: "Punjab", district: "Ludhiana", market: "Khanna APMC", commodity: "Wheat", modal: 2400 },
  {
    state: "Punjab",
    district: "Ludhiana",
    market: "Khanna APMC",
    commodity: "Wheat",
    modal: 2600,
    variety: "Dara",
  },
  { state: "Punjab", district: "Ludhiana", market: "Jagraon APMC", commodity: "Wheat", modal: 2500 },
  { state: "Punjab", district: "Moga", market: "Moga APMC", commodity: "Onion", modal: 1800 },
  { state: "Uttar Pradesh", district: "Agra", market: "Agra APMC", commodity: "Wheat", modal: 2300 },
  { state: "Uttar Pradesh", district: "Agra", market: "Agra APMC", commodity: "Potato", modal: 1200 },
  { state: "Madhya Pradesh", district: "Indore", market: "Indore APMC", commodity: "Wheat", modal: 2700 },
];

function setup(rows: Row[]) {
  const api = createFakeApi(rows, { maxWindow: 10_000 });
  const client = new DataGovInClient({ apiKey: "k", fetch: api.fetch, sleep: noSleep });
  return { api, client };
}

const count = async (query: ReturnType<typeof sql>) =>
  Number((await testDb().execute<{ n: string }>(query)).rows[0]!.n);

describe("mandi ingestion", () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(closeTestDb);

  it("ingests all states and is idempotent when run twice", async () => {
    const db = testDb();
    const { client } = setup(base.map(varietyRow));
    const first = await runMandiJob({
      db,
      client,
      logger,
      source: "variety",
      resourceId: RESOURCE,
      date: "2026-09-16",
      seedStates: [],
    });
    expect(first.status).toBe("success");
    expect(first.rowsUpserted).toBe(7);
    expect(await count(sql`select count(*) as n from prices_daily`)).toBe(7);

    const second = await runMandiJob({
      db,
      client,
      logger,
      source: "variety",
      resourceId: RESOURCE,
      date: "2026-09-16",
      seedStates: [],
    });
    expect(second.status).toBe("success");
    expect(await count(sql`select count(*) as n from prices_daily`)).toBe(7);
    expect(await count(sql`select count(*) as n from markets`)).toBe(5);
    expect(await count(sql`select count(*) as n from commodities`)).toBe(3);
    expect(await count(sql`select count(*) as n from ingest_runs where status = 'success'`)).toBe(2);
  });

  it("creates new commodities with a suggested, unconfirmed category", async () => {
    const db = testDb();
    const { client } = setup(base.map(varietyRow));
    await runMandiJob({
      db,
      client,
      logger,
      source: "variety",
      resourceId: RESOURCE,
      date: "2026-09-16",
      seedStates: [],
    });
    const rows = await db.execute<{
      source_name: string;
      category: string;
      category_confirmed: boolean;
      slug: string;
    }>(sql`
      select c.source_name, cat.slug as category, c.category_confirmed, c.slug
      from commodities c left join categories cat on cat.id = c.category_id order by c.source_name`);
    expect(rows.rows).toEqual([
      { source_name: "Onion", category: "vegetables", category_confirmed: false, slug: "onion" },
      { source_name: "Potato", category: "vegetables", category_confirmed: false, slug: "potato" },
      { source_name: "Wheat", category: "cereals", category_confirmed: false, slug: "wheat" },
    ]);
  });

  it("resumes a failed state without refetching finished ones", async () => {
    const db = testDb();
    const { api } = setup(base.map(varietyRow));
    // The Uttar Pradesh partition fetch fails on the first run; planning lookups still work.
    const originalFetch = api.fetch;
    let blockFullFetch = true;
    const client2 = new DataGovInClient({
      apiKey: "k",
      sleep: noSleep,
      fetch: (async (input: string | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        const isFullFetch = url.searchParams.get("limit") === "10000";
        const isUp = url.searchParams.get("filters[state.keyword]") === "Uttar Pradesh";
        if (blockFullFetch && isFullFetch && isUp) return new Response("bad", { status: 400 });
        return originalFetch(input, init);
      }) as typeof fetch,
    });

    const failed = await runMandiJob({
      db,
      client: client2,
      logger,
      source: "variety",
      resourceId: RESOURCE,
      date: "2026-09-16",
      seedStates: [],
    });
    expect(failed.status).toBe("partial");
    expect(failed.failedPartitions).toHaveLength(1);
    expect(await count(sql`select count(*) as n from prices_daily`)).toBe(5);

    blockFullFetch = false;
    const resumed = await runMandiJob({
      db,
      client: client2,
      logger,
      source: "variety",
      resourceId: RESOURCE,
      date: "2026-09-16",
      seedStates: [],
    });
    expect(resumed.resumed).toBe(true);
    expect(resumed.skippedPartitions).toBe(2);
    expect(resumed.status).toBe("success");
    expect(await count(sql`select count(*) as n from prices_daily`)).toBe(7);
  });

  it("final variety-wise data replaces provisional daily rows for that date and state", async () => {
    const db = testDb();
    // Provisional snapshot has one market that the final data does not (e.g. a spelling difference).
    const daily = setup([
      ...base.map(dailyRow),
      dailyRow({ state: "Punjab", district: "Moga", market: "Moga Mandi", commodity: "Onion", modal: 1700 }),
    ]);
    await runMandiJob({
      db,
      client: daily.client,
      logger,
      source: "daily",
      resourceId: RESOURCE,
      date: "2026-09-16",
      seedStates: [],
    });
    expect(await count(sql`select count(*) as n from prices_daily where source = 1`)).toBe(8);

    const final = setup(base.map((r) => varietyRow({ ...r, modal: r.modal + 10 })));
    const result = await runMandiJob({
      db,
      client: final.client,
      logger,
      source: "variety",
      resourceId: RESOURCE,
      date: "2026-09-16",
      seedStates: [],
    });
    expect(result.provisionalRemoved).toBe(1);
    expect(await count(sql`select count(*) as n from prices_daily where source = 1`)).toBe(0);
    expect(await count(sql`select count(*) as n from prices_daily where source = 2`)).toBe(7);
    expect(await count(sql`select count(*) as n from prices_daily where modal_price = 2410`)).toBe(1);

    // Provisional data never overwrites final data.
    await runMandiJob({
      db,
      client: daily.client,
      logger,
      source: "daily",
      resourceId: RESOURCE,
      date: "2026-09-16",
      seedStates: [],
    });
    expect(await count(sql`select count(*) as n from prices_daily where modal_price = 2400`)).toBe(0);
  });

  it("builds market, state and national medians", async () => {
    const db = testDb();
    const { client } = setup(base.map(varietyRow));
    await runMandiJob({
      db,
      client,
      logger,
      source: "variety",
      resourceId: RESOURCE,
      date: "2026-09-16",
      seedStates: [],
    });

    const khanna = await db.execute<{ modal_price: number; min_price: number; max_price: number }>(sql`
      select modal_price, min_price, max_price from prices_market_daily pm join markets m on m.id = pm.market_id
      join commodities c on c.id = pm.commodity_id where m.name = 'Khanna APMC' and c.source_name = 'Wheat'`);
    // Two rows (2400, 2600) → median 2500; min of mins 2300; max of maxes 2700.
    expect(khanna.rows[0]).toEqual({ modal_price: 2500, min_price: 2300, max_price: 2700 });

    const punjab = await db.execute<{ median_modal: number; markets_reporting: number }>(sql`
      select median_modal, markets_reporting from prices_state_daily s join states st on st.id = s.state_id
      join commodities c on c.id = s.commodity_id where st.name = 'Punjab' and c.source_name = 'Wheat'`);
    expect(punjab.rows[0]).toEqual({ median_modal: 2500, markets_reporting: 2 });

    const national = await db.execute<{
      median_modal: number;
      min_modal: number;
      max_modal: number;
      markets_reporting: number;
      states_reporting: number;
    }>(sql`
      select median_modal, min_modal, max_modal, markets_reporting, states_reporting from prices_national_daily n
      join commodities c on c.id = n.commodity_id where c.source_name = 'Wheat'`);
    // Market prices: Khanna 2500, Jagraon 2500, Agra 2300, Indore 2700 → median 2500.
    expect(national.rows[0]).toEqual({
      median_modal: 2500,
      min_modal: 2300,
      max_modal: 2700,
      markets_reporting: 4,
      states_reporting: 3,
    });
  });

  it("refuses to ingest when the date filter is not exact", async () => {
    const db = testDb();
    const { client } = setup(base.map((r) => varietyRow({ ...r, date: "15/09/2026" })));
    await expect(
      runMandiJob({
        db,
        client,
        logger,
        source: "variety",
        resourceId: RESOURCE,
        date: "2026-09-16",
        seedStates: [],
      }),
    ).rejects.toThrow(/No variety-wise rows published/);
    expect(await count(sql`select count(*) as n from ingest_runs where status = 'failed'`)).toBe(1);
  });

  it("stores rejects with reasons", async () => {
    const db = testDb();
    const rows = [
      ...base.map(varietyRow),
      { ...varietyRow(base[0]!), Market: "Bad APMC", Modal_Price: "NR" },
    ];
    const { client } = setup(rows);
    const result = await runMandiJob({
      db,
      client,
      logger,
      source: "variety",
      resourceId: RESOURCE,
      date: "2026-09-16",
      seedStates: [],
    });
    expect(result.rowsRejected).toBe(1);
    const rejects = await db.execute<{ reason: string }>(sql`select reason from ingest_rejects`);
    expect(rejects.rows).toEqual([{ reason: "invalid_modal_price" }]);
  });
});
