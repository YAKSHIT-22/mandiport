import type { DataGovInClient, Filters } from "./client";
import { normalizeRecordKeys } from "./fields";

/**
 * The API cannot page past its result window (10,000 rows) for one query, and one day of
 * mandi data is larger than that. Result order is also NOT stable between requests (verified
 * 2026-09-17: paging Keralam's 1,041 rows in pages of 1,000 returned 37 duplicates and
 * silently skipped 37 rows). So we split the query into partitions (state → district →
 * market) until each fits in the window, then fetch each partition in ONE request.
 * Partitions double as resumable checkpoints for ingestion.
 *
 * Filters are sent as `<field>.keyword`: plain field filters are full-text matches
 * ("Uttar Pradesh" also matches "Madhya Pradesh"). Values are kept raw, including stray
 * whitespace, because keyword filters need the exact stored value.
 */

export interface Partition {
  filters: Filters;
  total: number;
}

export interface PartitionPlan {
  /** Rows the unfiltered query reports. */
  expectedTotal: number;
  partitions: Partition[];
  /** Rows covered by `partitions`. Equals `expectedTotal` when coverage is complete. */
  plannedTotal: number;
  /** First-dimension values found in data that were not in the seed list. */
  discoveredValues: string[];
  /** Filters whose rows could not be fully covered, with the number of rows missing. */
  gaps: { filters: Filters; missing: number }[];
}

export interface PlanOptions {
  resourceId: string;
  /** Record fields from coarse to fine, e.g. ["state", "district", "market"]. */
  dimensions: string[];
  /** Known values of the first dimension. Missing ones are discovered from data. */
  seedValues?: string[];
  /**
   * Fields used to find first-dimension values that the unfiltered scan cannot reach
   * (rows beyond the result window), e.g. ["grade", "commodity"].
   */
  discoveryFields?: string[];
  baseFilters?: Filters;
}

export const keywordFilter = (field: string) => `${field}.keyword`;

async function totalFor(client: DataGovInClient, resourceId: string, filters: Filters): Promise<number> {
  const page = await client.fetchPage({ resourceId, limit: 1, filters });
  if (page.records.length === 0) return 0;
  if (page.total === null) {
    throw new Error("Partition planning needs JSON responses with a total; received CSV.");
  }
  return page.total;
}

/** Distinct raw values of several fields within the rows one request can return. */
export async function scanDistinct(
  client: DataGovInClient,
  resourceId: string,
  filters: Filters,
  fields: string[],
): Promise<Map<string, Set<string>>> {
  const values = new Map(fields.map((f) => [f, new Set<string>()]));
  const page = await client.fetchPage({ resourceId, filters, limit: client.maxResultWindow });
  for (const record of page.records) {
    const normalized = normalizeRecordKeys(record);
    for (const field of fields) {
      const value = normalized[field];
      if (typeof value === "string" && value !== "") values.get(field)!.add(value);
    }
  }
  return values;
}

const sorted = (set: Set<string> | undefined) => [...(set ?? [])].sort();

export async function planPartitions(client: DataGovInClient, options: PlanOptions): Promise<PartitionPlan> {
  const { resourceId, dimensions } = options;
  const maxWindow = client.maxResultWindow;
  const baseFilters = options.baseFilters ?? {};
  const [firstDimension] = dimensions;
  if (!firstDimension) throw new Error("planPartitions needs at least one dimension");

  const expectedTotal = await totalFor(client, resourceId, baseFilters);
  const partitions: Partition[] = [];
  const gaps: PartitionPlan["gaps"] = [];

  const split = async (filters: Filters, depth: number, total: number): Promise<void> => {
    if (total === 0) return;
    if (total <= maxWindow) {
      partitions.push({ filters, total });
      return;
    }
    const dimension = dimensions[depth];
    if (!dimension) {
      gaps.push({ filters, missing: total - maxWindow });
      partitions.push({ filters, total: maxWindow });
      return;
    }
    const found = await scanDistinct(client, resourceId, filters, [dimension]);
    let covered = 0;
    for (const value of sorted(found.get(dimension))) {
      const childFilters = { ...filters, [keywordFilter(dimension)]: value };
      const childTotal = await totalFor(client, resourceId, childFilters);
      covered += childTotal;
      await split(childFilters, depth + 1, childTotal);
    }
    if (covered < total) gaps.push({ filters, missing: total - covered });
  };

  const seen = new Set<string>();
  const discoveredValues: string[] = [];
  let covered = 0;
  const visit = async (value: string, discovered: boolean) => {
    if (seen.has(value)) return;
    seen.add(value);
    const filters = { ...baseFilters, [keywordFilter(firstDimension)]: value };
    const total = await totalFor(client, resourceId, filters);
    if (discovered) discoveredValues.push(value);
    covered += total;
    await split(filters, 1, total);
  };
  const visitAll = async (values: Iterable<string>) => {
    for (const value of [...values].sort()) {
      if (covered >= expectedTotal) return;
      await visit(value, true);
    }
  };

  for (const value of options.seedValues ?? []) await visit(value, false);

  // 1. Values in the rows an unfiltered query can reach.
  const discoveryFields = options.discoveryFields ?? [];
  if (covered < expectedTotal) {
    const found = await scanDistinct(client, resourceId, baseFilters, [firstDimension, ...discoveryFields]);
    await visitAll(found.get(firstDimension) ?? []);

    // 2. Rows beyond the window: scan small slices cut by other fields.
    for (const field of discoveryFields) {
      for (const value of sorted(found.get(field))) {
        if (covered >= expectedTotal) break;
        const filters = { ...baseFilters, [keywordFilter(field)]: value };
        const total = await totalFor(client, resourceId, filters);
        if (total === 0 || total > maxWindow) continue;
        const slice = await scanDistinct(client, resourceId, filters, [firstDimension]);
        await visitAll([...(slice.get(firstDimension) ?? [])].filter((v) => !seen.has(v)));
      }
    }
  }
  if (covered < expectedTotal) gaps.push({ filters: baseFilters, missing: expectedTotal - covered });

  const plannedTotal = partitions.reduce((sum, p) => sum + p.total, 0);
  return { expectedTotal, partitions, plannedTotal, discoveredValues, gaps };
}

export interface PartitionFetch {
  records: Record<string, unknown>[];
  /** Total the API reported for this request (can grow as late markets report). */
  total: number;
  /** True when records.length matched the reported total. */
  complete: boolean;
}

/**
 * Fetches a whole partition in a single request (no paging, see file comment). Rows can be
 * added between planning and fetching; if the partition has outgrown the window the result
 * is marked incomplete so the caller can re-plan it.
 */
export async function fetchPartition(
  client: DataGovInClient,
  resourceId: string,
  partition: Partition,
): Promise<PartitionFetch> {
  const page = await client.fetchPage({
    resourceId,
    filters: partition.filters,
    limit: client.maxResultWindow,
  });
  const total = page.total ?? page.records.length;
  return { records: page.records, total, complete: page.records.length >= total };
}
