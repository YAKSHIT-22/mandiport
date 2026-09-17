/**
 * Phase 1 data discovery: pulls the entire current mandi daily snapshot, all states and
 * commodities, state by state. Saves name lists to tests/fixtures/names/, the raw rows to
 * .data/pulls/ (gitignored) and prints a runtime + volume report.
 *
 *   pnpm pull-day
 */
import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { createGzip } from "node:zlib";
import { getEnv, requireEnv } from "@/env";
import {
  DataGovInClient,
  fetchPartition,
  normalizeMandiRecord,
  planPartitions,
  type MandiPriceRecord,
} from "@/lib/datagovin";
import { dataGovInFetch } from "@/lib/datagovin/transport";
import { logger } from "./lib/log";

const NAMES_DIR = path.join("tests", "fixtures", "names");
const PULLS_DIR = path.join(".data", "pulls");
const STATE_SEEDS = path.join(NAMES_DIR, "states.json");

/** States and UTs as commonly spelled; the API also uses its own spellings (e.g. "Keralam"). */
const OFFICIAL_STATES = [
  "Andaman and Nicobar",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chattisgarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli",
  "Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Keralam",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "NCT of Delhi",
  "Odisha",
  "Puducherry",
  "Pondicherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "Uttrakhand",
  "West Bengal",
];

async function readSeeds(): Promise<string[]> {
  try {
    const parsed = JSON.parse(await readFile(STATE_SEEDS, "utf8")) as { raw?: string[] };
    return [...new Set([...(parsed.raw ?? []), ...OFFICIAL_STATES])];
  } catch {
    return OFFICIAL_STATES;
  }
}

const sortedCounts = (map: Map<string, number>) =>
  Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));

async function main() {
  const env = getEnv();
  const resourceId = env.DATAGOVIN_RESOURCE_MANDI_DAILY;

  const stats = { requests: 0, bytes: 0 };
  const countingFetch = (async (input: string | URL, init?: RequestInit) => {
    stats.requests++;
    const response = await dataGovInFetch(input, init);
    const body = await response.text();
    stats.bytes += Buffer.byteLength(body);
    return new Response(body, { status: response.status, headers: response.headers });
  }) as typeof fetch;

  // Gateway allows ~60 requests/minute (measured 2026-09-17); stay under it.
  const client = new DataGovInClient({
    apiKey: requireEnv("DATAGOVIN_API_KEY"),
    logger,
    fetch: countingFetch,
    minRequestIntervalMs: 1_100,
  });

  const started = Date.now();
  const seeds = await readSeeds();
  logger.info("planning partitions", { resourceId, seedStates: seeds.length });
  const plan = await planPartitions(client, {
    resourceId,
    dimensions: ["state", "district", "market"],
    discoveryFields: ["grade", "commodity"],
    seedValues: seeds,
  });
  const planMs = Date.now() - started;
  const planRequests = stats.requests;
  logger.info("plan ready", {
    expectedTotal: plan.expectedTotal,
    plannedTotal: plan.plannedTotal,
    partitions: plan.partitions.length,
    discoveredStates: plan.discoveredValues.length,
    gaps: plan.gaps,
    planMs,
  });

  const accepted = new Map<string, MandiPriceRecord>();
  const rawRows: Record<string, unknown>[] = [];
  const rejects = new Map<string, number>();
  const rejectSamples: { reason: string; raw: Record<string, unknown> }[] = [];
  let fetched = 0;
  let duplicates = 0;
  const incomplete: { filters: Record<string, string>; total: number; got: number }[] = [];

  for (const [index, partition] of plan.partitions.entries()) {
    const partitionStart = Date.now();
    const result = await fetchPartition(client, resourceId, partition);
    if (!result.complete)
      incomplete.push({ filters: partition.filters, total: result.total, got: result.records.length });
    const rows = result.records.length;
    for (const raw of result.records) {
      rawRows.push(raw);
      const normalized = normalizeMandiRecord(raw);
      if (!normalized.ok) {
        rejects.set(normalized.reason, (rejects.get(normalized.reason) ?? 0) + 1);
        if (rejectSamples.filter((s) => s.reason === normalized.reason).length < 5) {
          rejectSamples.push({ reason: normalized.reason, raw });
        }
        continue;
      }
      const v = normalized.value;
      const key = [v.arrivalDate, v.state, v.district, v.market, v.commodity, v.variety, v.grade].join("|");
      if (accepted.has(key)) duplicates++;
      accepted.set(key, v);
    }
    fetched += rows;
    logger.info("partition done", {
      index: index + 1,
      of: plan.partitions.length,
      filters: partition.filters,
      expected: partition.total,
      rows,
      apiTotalNow: result.total,
      ms: Date.now() - partitionStart,
    });
  }
  const totalMs = Date.now() - started;

  // Name lists and volume breakdowns from real data.
  const records = [...accepted.values()];
  const count = <K extends string>(keyOf: (r: MandiPriceRecord) => K) => {
    const map = new Map<string, number>();
    for (const r of records) map.set(keyOf(r), (map.get(keyOf(r)) ?? 0) + 1);
    return map;
  };
  const distinctSet = (keyOf: (r: MandiPriceRecord) => string) => new Set(records.map(keyOf));

  const commodityMarkets = new Map<string, Set<string>>();
  const commodityVarieties = new Map<string, Set<string>>();
  for (const r of records) {
    const marketKey = `${r.state}|${r.district}|${r.market}`;
    if (!commodityMarkets.has(r.commodity)) commodityMarkets.set(r.commodity, new Set());
    commodityMarkets.get(r.commodity)!.add(marketKey);
    if (!commodityVarieties.has(r.commodity)) commodityVarieties.set(r.commodity, new Set());
    if (r.variety) commodityVarieties.get(r.commodity)!.add(r.variety);
  }

  const rawStates = [...new Set(rawRows.map((r) => String(r.state)))].sort();
  const pulledAt = new Date().toISOString();
  const arrivalDates = sortedCounts(count((r) => r.arrivalDate));

  await mkdir(NAMES_DIR, { recursive: true });
  const writeJson = (file: string, data: unknown) =>
    writeFile(path.join(NAMES_DIR, file), JSON.stringify(data, null, 2) + "\n");

  await writeJson("states.json", {
    pulledAt,
    note: "raw = exact API values, needed for .keyword filters",
    raw: rawStates,
    rowsByState: sortedCounts(count((r) => r.state)),
  });
  await writeJson("commodities.json", {
    pulledAt,
    commodities: [...commodityMarkets.entries()]
      .map(([name, markets]) => ({
        name,
        rows: records.filter((r) => r.commodity === name).length,
        markets: markets.size,
      }))
      .sort((a, b) => b.markets - a.markets || a.name.localeCompare(b.name)),
  });
  await writeJson("varieties.json", {
    pulledAt,
    byCommodity: Object.fromEntries(
      [...commodityVarieties.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([c, set]) => [c, [...set].sort()]),
    ),
  });
  await writeJson("grades.json", { pulledAt, grades: sortedCounts(count((r) => r.grade ?? "(none)")) });
  await writeJson("markets.json", {
    pulledAt,
    markets: [...distinctSet((r) => `${r.state}|${r.district}|${r.market}`)].sort(),
  });

  // Raw rows for storage measurement (gitignored).
  await mkdir(PULLS_DIR, { recursive: true });
  const stamp = pulledAt.slice(0, 16).replace(/[:T]/g, "-");
  const rawFile = path.join(PULLS_DIR, `mandi-daily-${stamp}.jsonl.gz`);
  await pipeline(
    Readable.from(rawRows.map((r) => JSON.stringify(r) + "\n")),
    createGzip(),
    createWriteStream(rawFile),
  );

  const report = {
    pulledAt,
    resourceId,
    runtime: { totalMs, planMs, fetchMs: totalMs - planMs },
    requests: { total: stats.requests, planning: planRequests, bytes: stats.bytes },
    rows: {
      apiTotal: plan.expectedTotal,
      planned: plan.plannedTotal,
      fetched,
      accepted: accepted.size,
      duplicates,
      rejected: Object.fromEntries(rejects),
    },
    coverageGaps: plan.gaps,
    incompletePartitions: incomplete,
    partitions: plan.partitions.length,
    distinct: {
      states: distinctSet((r) => r.state).size,
      districts: distinctSet((r) => `${r.state}|${r.district}`).size,
      markets: distinctSet((r) => `${r.state}|${r.district}|${r.market}`).size,
      commodities: commodityMarkets.size,
      varieties: distinctSet((r) => `${r.commodity}|${r.variety}`).size,
      grades: distinctSet((r) => r.grade ?? "").size,
    },
    arrivalDates,
    rejectSamples,
    rawFile,
  };
  await writeFile(path.join(PULLS_DIR, `report-${stamp}.json`), JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify({ ...report, rejectSamples: `${rejectSamples.length} saved in report file` }, null, 2),
  );
}

main().catch((error: unknown) => {
  logger.error("pull-day failed", { error: error instanceof Error ? error.stack : String(error) });
  process.exit(1);
});
