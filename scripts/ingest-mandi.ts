/**
 * Mandi price ingestion (SPEC §6.7).
 *
 *   pnpm ingest:mandi                                  # current daily snapshot (provisional)
 *   pnpm ingest:mandi --source=variety --date=2026-09-16   # final variety-wise data for one date
 *   pnpm ingest:backfill --days=90                     # final data for the last 90 days, skipping done dates
 *
 * Options: --max-minutes=40 stops starting new work after that long (resume on next run).
 */
import { sql } from "drizzle-orm";
import { requireEnv } from "@/env";
import { todayInIst } from "@/lib/dates";
import { runMandiJob, type MandiSource } from "@/lib/ingest/mandi-job";
import { daysBefore } from "@/lib/ingest/rollups";
import { afterIngest } from "@/lib/ingest/after-ingest";
import { registerDefaultPostIngestSteps } from "@/lib/ingest/post-steps";
import { arg, createClient, logger, runScript } from "./lib/context";

registerDefaultPostIngestSteps();

runScript("ingest-mandi", async ({ env, db }) => {
  const source = (arg("source") ?? "daily") as MandiSource;
  if (source !== "daily" && source !== "variety") throw new Error(`Unknown --source=${source}`);
  const maxMinutes = Number(arg("max-minutes") ?? 40);
  const deadline = Date.now() + maxMinutes * 60_000;
  const client = createClient();
  const today = todayInIst();

  let dates: string[];
  if (source === "daily") {
    dates = [today];
  } else if (arg("date")) {
    dates = [arg("date")!];
  } else {
    const days = Number(arg("days") ?? 2);
    // Variety-wise data is published the next day, so start from yesterday.
    const wanted = Array.from({ length: days }, (_, i) => daysBefore(today, i + 1));
    const done = await db.execute<{ date: string }>(sql`
      select params->>'date' as date from ingest_runs
      where job = 'mandi-variety' and status = 'success'`);
    const doneSet = new Set(done.rows.map((r) => r.date));
    dates = wanted.filter((d) => !doneSet.has(d));
    logger.info("backfill plan", { requested: days, alreadyDone: days - dates.length, toDo: dates.length });
  }

  const resourceId =
    source === "daily" ? env.DATAGOVIN_RESOURCE_MANDI_DAILY : requireEnv("DATAGOVIN_RESOURCE_MANDI_VARIETY");

  const touchedDates = new Set<string>();
  const touchedCommodities = new Set<number>();
  let failures = 0;
  for (const date of dates) {
    if (Date.now() > deadline) {
      logger.warn("time budget reached; remaining dates will run next time", {
        remaining: dates.slice(dates.indexOf(date)),
      });
      break;
    }
    const result = await runMandiJob({ db, client, logger, source, resourceId, date, deadline });
    result.dates.forEach((d) => touchedDates.add(d));
    result.commodityIds.forEach((c) => touchedCommodities.add(c));
    if (result.status !== "success") failures++;
    logger.info("mandi job result", { ...result, commodityIds: result.commodityIds.length });
  }

  await afterIngest({ db, logger, dates: [...touchedDates], commodityIds: [...touchedCommodities] });
  if (failures > 0) process.exitCode = 1;
});
