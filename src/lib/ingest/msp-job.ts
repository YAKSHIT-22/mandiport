import { sql } from "drizzle-orm";
import { normalizeMspRows } from "@/lib/datagovin/msp";
import type { DataGovInClient, Logger } from "@/lib/datagovin";
import type { Db } from "@/lib/db";
import { msp } from "@/lib/db/schema";
import { IngestRun } from "./runs";

export async function runMspJob(opts: {
  db: Db;
  client: DataGovInClient;
  logger: Logger;
  resourceIds: string[];
}) {
  const { db, client, logger, resourceIds } = opts;
  const run = await IngestRun.start(db, "msp", { resources: resourceIds });
  try {
    const commodityRows = await db.execute<{ id: number; source_name: string }>(
      sql`select id, source_name from commodities`,
    );
    const commodityIds = new Map(commodityRows.rows.map((r) => [r.source_name, r.id]));
    let upserted = 0;

    for (const resourceId of resourceIds) {
      // MSP tables are tiny (< 100 rows); one request each.
      const page = await client.fetchPage({ resourceId, limit: 1_000 });
      run.rowsFetched += page.records.length;
      const { records, rejects } = normalizeMspRows(page.records);
      await run.reject(rejects);

      if (records.length > 0) {
        const result = await db
          .insert(msp)
          .values(
            records.map((r) => ({
              sourceName: r.canonicalName,
              variety: r.variety,
              commodityId: r.mandiName ? (commodityIds.get(r.mandiName) ?? null) : null,
              season: r.season,
              year: r.year,
              mspPrice: r.mspPrice,
              resourceId,
            })),
          )
          .onConflictDoUpdate({
            target: [msp.sourceName, msp.variety, msp.season, msp.year],
            set: {
              mspPrice: sql`excluded.msp_price`,
              commodityId: sql`excluded.commodity_id`,
              resourceId: sql`excluded.resource_id`,
              updatedAt: sql`now()`,
            },
          })
          .returning({ id: msp.id });
        upserted += result.length;
      }
      logger.info("msp resource ingested", {
        resourceId,
        rows: page.records.length,
        records: records.length,
        rejects: rejects.length,
      });
    }
    run.rowsUpserted = upserted;
    await run.finish("success");
    return { runId: run.id, upserted, rejected: run.rowsRejected };
  } catch (error) {
    await run.finish("failed", error);
    throw error;
  }
}
