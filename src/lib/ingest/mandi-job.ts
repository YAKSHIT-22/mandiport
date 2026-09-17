import { sql } from "drizzle-orm";
import {
  DataGovInClient,
  fetchPartition,
  normalizeMandiRecord,
  planPartitions,
  type Logger,
  type MandiPriceRecord,
  type PartitionPlan,
} from "@/lib/datagovin";
import type { Db } from "@/lib/db";
import { PRICE_SOURCE } from "@/lib/db/schema";
import { refreshDailyAggregates } from "./aggregates";
import { ensureUniqueMarketSlugsPerState } from "./market-slugs";
import { DimensionResolver } from "./dimensions";
import { removeProvisionalRows, upsertMandiPrices } from "./prices";
import { IngestRun } from "./runs";

export type MandiSource = "daily" | "variety";

export interface MandiJobOptions {
  db: Db;
  client: DataGovInClient;
  logger: Logger;
  source: MandiSource;
  resourceId: string;
  /** Required for "variety" (the date to pull); informational for "daily". YYYY-MM-DD. */
  date: string;
  /** Known state names used as partition seeds. */
  seedStates?: string[];
  /** Stop starting new partitions after this time (ms since epoch). */
  deadline?: number;
}

export interface MandiJobResult {
  runId: number;
  status: "success" | "partial" | "failed";
  plan: Pick<PartitionPlan, "expectedTotal" | "plannedTotal" | "gaps"> & { partitions: number };
  rowsFetched: number;
  rowsUpserted: number;
  rowsRejected: number;
  provisionalRemoved: number;
  dates: string[];
  commodityIds: number[];
  resumed: boolean;
  skippedPartitions: number;
  failedPartitions: { filters: Record<string, string>; error: string }[];
  durationMs: number;
}

export const VARIETY_DATE_FILTER = "Arrival_Date";

export const toDdMmYyyy = (iso: string) => iso.split("-").reverse().join("/");

export const partitionKey = (filters: Record<string, string>) =>
  JSON.stringify(Object.fromEntries(Object.entries(filters).sort(([a], [b]) => a.localeCompare(b))));

/**
 * Ingests one day of mandi prices, state by state, resumably (SPEC §6.7).
 * - "daily": the current snapshot (provisional rows, source 1).
 * - "variety": the final variety-wise data for `date` (source 2), which replaces provisional rows.
 */
export async function runMandiJob(options: MandiJobOptions): Promise<MandiJobResult> {
  const { db, client, logger, source, resourceId, date } = options;
  const started = Date.now();
  const job = source === "daily" ? "mandi-daily" : "mandi-variety";
  const run = await IngestRun.start(db, job, { date });
  const resolver = new DimensionResolver(db);
  const priceSource = source === "daily" ? PRICE_SOURCE.mandiDaily : PRICE_SOURCE.mandiVariety;

  const dates = new Set<string>();
  const commodityIds = new Set<number>();
  const failedPartitions: MandiJobResult["failedPartitions"] = [];
  let skipped = 0;
  let provisionalRemoved = 0;
  let plan: PartitionPlan | undefined;

  try {
    const seeds =
      options.seedStates ??
      (await db.execute<{ name: string }>(sql`select name from states order by name`)).rows.map(
        (r) => r.name,
      );

    let baseFilters: Record<string, string> = {};
    if (source === "variety") {
      // Verified 2026-09-17: only `Arrival_Date` (capitalised) filters exactly on this resource;
      // lowercase `arrival_date` silently becomes a loose full-text match over millions of rows.
      baseFilters = { [VARIETY_DATE_FILTER]: toDdMmYyyy(date) };
      const check = await client.verifyFilter(resourceId, VARIETY_DATE_FILTER, toDdMmYyyy(date), 50);
      if (check.status === "no-match") {
        throw new Error(`No variety-wise rows published for ${date} yet`);
      }
      if (check.status !== "ok") {
        throw new Error(
          `Date filter ${VARIETY_DATE_FILTER} is ${check.status} on ${resourceId}; refusing to ingest`,
        );
      }
    }

    plan = await planPartitions(client, {
      resourceId,
      dimensions: source === "daily" ? ["state", "district", "market"] : ["state", "district", "commodity"],
      discoveryFields: source === "daily" ? ["grade", "commodity"] : ["commodity"],
      seedValues: seeds,
      baseFilters,
    });
    logger.info("partition plan", {
      job,
      date,
      expectedTotal: plan.expectedTotal,
      plannedTotal: plan.plannedTotal,
      partitions: plan.partitions.length,
      gaps: plan.gaps,
      resumed: run.resumed,
    });

    for (const partition of plan.partitions) {
      const pkey = partitionKey(partition.filters);
      if (run.isDone(pkey)) {
        skipped++;
        continue;
      }
      if (options.deadline && Date.now() > options.deadline) {
        failedPartitions.push({ filters: partition.filters, error: "deadline reached before start" });
        continue;
      }
      try {
        const fetched = await fetchPartition(client, resourceId, partition);
        run.rowsFetched += fetched.records.length;
        if (!fetched.complete) {
          logger.warn("partition outgrew the result window; some rows not fetched", {
            filters: partition.filters,
            total: fetched.total,
            got: fetched.records.length,
          });
        }

        const accepted: MandiPriceRecord[] = [];
        const rejects: { raw: unknown; reason: string }[] = [];
        for (const raw of fetched.records) {
          const result = normalizeMandiRecord(raw);
          if (!result.ok) rejects.push({ raw, reason: result.reason });
          else if (source === "variety" && result.value.arrivalDate !== date) {
            rejects.push({ raw, reason: "arrival_date_mismatch" });
          } else accepted.push(result.value);
        }
        await run.reject(rejects);

        const upsert = await upsertMandiPrices(db, resolver, accepted, priceSource);
        run.rowsUpserted += upsert.upserted;
        upsert.dates.forEach((d) => dates.add(d));
        upsert.commodityIds.forEach((id) => commodityIds.add(id));
        await run.markDone(pkey);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn("partition failed", { filters: partition.filters, error: message });
        failedPartitions.push({ filters: partition.filters, error: message });
        await run.save();
      }
    }

    const complete = failedPartitions.length === 0 && plan.gaps.length === 0;
    if (source === "variety" && failedPartitions.length === 0) {
      // Final data replaces provisional rows, state by state, only when that state fully loaded.
      const states = new Set(
        plan.partitions.map((p) => p.filters["state.keyword"]).filter(Boolean) as string[],
      );
      for (const state of states) provisionalRemoved += await removeProvisionalRows(db, date, state);
      dates.add(date);
    }

    await ensureUniqueMarketSlugsPerState(db);
    await refreshDailyAggregates(db, [...dates]);
    const status = complete
      ? "success"
      : failedPartitions.length === plan.partitions.length
        ? "failed"
        : "partial";
    await run.finish(
      status,
      failedPartitions.length ? `${failedPartitions.length} partition(s) failed` : undefined,
    );

    return {
      runId: run.id,
      status,
      plan: {
        expectedTotal: plan.expectedTotal,
        plannedTotal: plan.plannedTotal,
        gaps: plan.gaps,
        partitions: plan.partitions.length,
      },
      rowsFetched: run.rowsFetched,
      rowsUpserted: run.rowsUpserted,
      rowsRejected: run.rowsRejected,
      provisionalRemoved,
      dates: [...dates].sort(),
      commodityIds: [...commodityIds],
      resumed: run.resumed,
      skippedPartitions: skipped,
      failedPartitions,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    await run.finish("failed", error);
    throw error;
  }
}
