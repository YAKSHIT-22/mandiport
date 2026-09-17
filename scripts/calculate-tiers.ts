/** Recalculates commodity tiers from the last 90 days (SPEC §6.4). --as-of=YYYY-MM-DD */
import { sql } from "drizzle-orm";
import { recalculateTiers } from "@/lib/tiers";
import { arg, logger, runScript } from "./lib/context";

runScript("calculate-tiers", async ({ db }) => {
  const latest = await db.execute<{ d: string | null }>(
    sql`select max(arrival_date)::text as d from prices_market_daily`,
  );
  const asOf = arg("as-of") ?? latest.rows[0]?.d;
  if (!asOf) throw new Error("No price data yet; ingest first");
  const { counts, changes } = await recalculateTiers(db, asOf);
  logger.info("tiers recalculated", { asOf, counts, changes: changes.length });
  for (const c of changes.slice(0, 50)) logger.info("tier change", { ...c });
});
