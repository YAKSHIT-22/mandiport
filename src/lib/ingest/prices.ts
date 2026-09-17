import { and, eq, inArray, sql } from "drizzle-orm";
import type { MandiPriceRecord } from "@/lib/datagovin/mandi";
import type { Db } from "@/lib/db";
import { districts, markets, pricesDaily, states, type PriceSource } from "@/lib/db/schema";
import { DimensionResolver } from "./dimensions";

export const UPSERT_BATCH_SIZE = 500;

export interface UpsertResult {
  upserted: number;
  /** Distinct arrival dates touched (YYYY-MM-DD). */
  dates: string[];
  commodityIds: number[];
  stateIds: number[];
}

/**
 * Bulk upserts normalized mandi rows (SPEC §6.7: batches of 500 inside transactions, never
 * row by row). Final variety-wise rows (source 2) overwrite provisional daily rows
 * (source 1); provisional rows never overwrite final ones.
 */
export async function upsertMandiPrices(
  db: Db,
  resolver: DimensionResolver,
  records: MandiPriceRecord[],
  source: PriceSource,
): Promise<UpsertResult> {
  const ids = await resolver.resolveAll(records);

  // Deduplicate on the natural key (last wins): Postgres rejects a batch that
  // updates the same row twice.
  const byKey = new Map<string, typeof pricesDaily.$inferInsert>();
  const stateIds = new Set<number>();
  records.forEach((record, i) => {
    const id = ids[i]!;
    stateIds.add(id.stateId);
    const row = {
      arrivalDate: record.arrivalDate,
      marketId: id.marketId,
      commodityId: id.commodityId,
      varietyId: id.varietyId,
      gradeId: id.gradeId,
      source,
      minPrice: record.minPrice,
      maxPrice: record.maxPrice,
      modalPrice: record.modalPrice,
    };
    byKey.set([row.marketId, row.commodityId, row.arrivalDate, row.varietyId, row.gradeId].join("|"), row);
  });
  const rows = [...byKey.values()];

  let upserted = 0;
  for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + UPSERT_BATCH_SIZE);
    await db.transaction(async (tx) => {
      const result = await tx
        .insert(pricesDaily)
        .values(batch)
        .onConflictDoUpdate({
          target: [
            pricesDaily.marketId,
            pricesDaily.commodityId,
            pricesDaily.arrivalDate,
            pricesDaily.varietyId,
            pricesDaily.gradeId,
          ],
          set: {
            minPrice: sql`excluded.min_price`,
            maxPrice: sql`excluded.max_price`,
            modalPrice: sql`excluded.modal_price`,
            source: sql`excluded.source`,
          },
          setWhere: sql`${pricesDaily.source} <= excluded.source`,
        })
        .returning({ marketId: pricesDaily.marketId });
      upserted += result.length;
    });
  }

  return {
    upserted,
    dates: [...new Set(rows.map((r) => r.arrivalDate))].sort(),
    commodityIds: [...new Set(rows.map((r) => r.commodityId))],
    stateIds: [...stateIds],
  };
}

/**
 * Once the final variety-wise data for a date and state is fully ingested, provisional
 * rows that it did not overwrite are removed so the same observation is never counted
 * twice (DECISIONS D-013).
 */
export async function removeProvisionalRows(db: Db, arrivalDate: string, stateName: string): Promise<number> {
  const marketIds = db
    .select({ id: markets.id })
    .from(markets)
    .innerJoin(districts, eq(markets.districtId, districts.id))
    .innerJoin(states, eq(districts.stateId, states.id))
    .where(eq(states.name, stateName));
  const deleted = await db
    .delete(pricesDaily)
    .where(
      and(
        eq(pricesDaily.arrivalDate, arrivalDate),
        eq(pricesDaily.source, 1),
        inArray(pricesDaily.marketId, marketIds),
      ),
    )
    .returning({ marketId: pricesDaily.marketId });
  return deleted.length;
}
