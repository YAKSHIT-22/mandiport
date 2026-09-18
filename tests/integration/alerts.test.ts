import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { alertMessage, findTriggeredAlerts, markAlertSent } from "@/lib/alerts/check";
import { generateLinkCode } from "@/lib/telegram/client";
import { closeTestDb, resetDb, testDb } from "../helpers/db";

const TODAY = "2026-09-17";

async function seed() {
  const db = testDb();
  await db.execute(sql`insert into states (name, slug) values ('Maharashtra', 'maharashtra')`);
  await db.execute(
    sql`insert into commodities (source_name, display_name, slug, tier) values ('Onion', 'Onion', 'onion', 1)`,
  );
  await db.execute(sql`
    insert into prices_national_daily (arrival_date, commodity_id, median_modal, min_modal, max_modal, markets_reporting, states_reporting)
    values (${TODAY}::date - 1, 1, 2500, 2000, 3000, 40, 8)`);
  await db.execute(sql`
    insert into prices_state_daily (arrival_date, state_id, commodity_id, median_modal, markets_reporting)
    values (${TODAY}::date - 1, 1, 1, 2800, 12)`);
}

const addAlert = (values: Record<string, unknown>) =>
  testDb().execute(sql`
    insert into alerts (telegram_chat_id, commodity_id, state_id, direction, threshold, active, last_triggered_on)
    values (${values.chat ?? "111"}, 1, ${values.stateId ?? null}, ${values.direction ?? "above"}, ${values.threshold ?? 2000},
            ${values.active ?? true}, ${values.lastTriggered ?? null})`);

describe("price alerts", () => {
  beforeEach(async () => {
    await resetDb();
    await seed();
  });
  afterAll(closeTestDb);

  it("triggers when the national median crosses the level", async () => {
    await addAlert({ direction: "above", threshold: 2400 });
    const triggered = await findTriggeredAlerts(testDb(), TODAY);
    expect(triggered).toHaveLength(1);
    expect(triggered[0]).toMatchObject({ crop: "Onion", place: "India", price: 2500, markets: 40 });
  });

  it("uses the state median when the alert names a state", async () => {
    await addAlert({ stateId: 1, direction: "above", threshold: 2700 });
    const [triggered] = await findTriggeredAlerts(testDb(), TODAY);
    expect(triggered).toMatchObject({ place: "Maharashtra", price: 2800, markets: 12 });
  });

  it("does not trigger when the price has not crossed", async () => {
    await addAlert({ direction: "above", threshold: 5000 });
    await addAlert({ direction: "below", threshold: 1000 });
    expect(await findTriggeredAlerts(testDb(), TODAY)).toEqual([]);
  });

  it("sends at most one message per alert per day, and skips inactive alerts", async () => {
    await addAlert({ direction: "above", threshold: 2400, lastTriggered: TODAY });
    await addAlert({ chat: "222", direction: "above", threshold: 2400, active: false });
    expect(await findTriggeredAlerts(testDb(), TODAY)).toEqual([]);
  });

  it("ignores prices older than three days", async () => {
    await testDb().execute(sql`update prices_national_daily set arrival_date = ${TODAY}::date - 9`);
    await testDb().execute(sql`update prices_state_daily set arrival_date = ${TODAY}::date - 9`);
    await addAlert({ direction: "above", threshold: 2400 });
    expect(await findTriggeredAlerts(testDb(), TODAY)).toEqual([]);
  });

  it("marks an alert as sent so it does not repeat", async () => {
    await addAlert({ direction: "above", threshold: 2400 });
    const [triggered] = await findTriggeredAlerts(testDb(), TODAY);
    await markAlertSent(testDb(), triggered!.id, TODAY);
    expect(await findTriggeredAlerts(testDb(), TODAY)).toEqual([]);
  });

  it("writes a message with the price, place, date and how to stop", async () => {
    await addAlert({ direction: "above", threshold: 2400 });
    const [triggered] = await findTriggeredAlerts(testDb(), TODAY);
    const message = alertMessage(triggered!, "https://mandiport.in");
    expect(message).toContain("₹2,500 per quintal");
    expect(message).toContain("16 Sep 2026");
    expect(message).toContain("/stop");
    expect(message).toContain("https://mandiport.in/crops/onion");
  });

  it("generates readable link codes without ambiguous characters", () => {
    const code = generateLinkCode(() => 0.999);
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
    expect(code).not.toMatch(/[OIL01]/);
  });
});
