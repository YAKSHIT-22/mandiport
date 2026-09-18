import { sql } from "drizzle-orm";
import exportCommodityList from "../../../data/export-commodities.json";
import {
  countryDisplayName,
  exportKey,
  findExportField,
  normalizeExportRow,
  type ExportRecord,
} from "@/lib/datagovin/exports";
import type { DataGovInClient, Logger } from "@/lib/datagovin";
import type { Db } from "@/lib/db";
import { countries, exportCommodities, exportsAnnual } from "@/lib/db/schema";
import { uniqueSlug } from "@/lib/slug";
import { IngestRun } from "./runs";

export const EXPORT_SOURCE = "doc_principal_commodity";
export const EXPORT_TOTAL_SOURCE = "computed_total";

/**
 * Pulls agricultural principal commodities from each yearly export resource (SPEC §6.7).
 * The resources expose no exact filters, and plain filters are full-text, so each
 * commodity is requested by name in one call and matched exactly on the normalized key.
 */
export async function runExportsJob(opts: {
  db: Db;
  client: DataGovInClient;
  logger: Logger;
  years: { year: string; resourceId: string }[];
}) {
  const { db, client, logger, years } = opts;
  const run = await IngestRun.start(db, "exports", { years: years.map((y) => y.year) });

  try {
    const commodityIds = await ensureExportCommodities(db);
    const countryIds = new Map<string, number>();
    (await db.execute<{ id: number; name: string }>(sql`select id, name from countries`)).rows.forEach((r) =>
      countryIds.set(r.name, r.id),
    );
    const countrySlugs = new Set(
      (await db.execute<{ slug: string }>(sql`select slug from countries`)).rows.map((r) => r.slug),
    );

    for (const { year, resourceId } of years) {
      const partitionKey = year;
      if (run.isDone(partitionKey)) continue;

      // Field names differ in every era of the series; find them from a one-row sample.
      const sample = await client.fetchPage({ resourceId, limit: 1 });
      const sampleKeys = Object.keys(sample.records[0] ?? {});
      const fieldName = findExportField(sampleKeys, "commodity");
      if (!fieldName)
        throw new Error(
          `No commodity field in export resource ${resourceId} (${year}); fields: ${sampleKeys.join(", ")}`,
        );
      if ((sample.total ?? 0) < 1000) {
        logger.warn("export resource looks incomplete for a full year", {
          year,
          resourceId,
          total: sample.total,
        });
      }

      const yearRecords: ExportRecord[] = [];
      for (const commodity of exportCommodityList.commodities) {
        const page = await client.fetchPage({
          resourceId,
          limit: client.maxResultWindow,
          filters: { [fieldName]: commodity.publishedName.replace(/[^A-Za-z0-9 ]+/g, " ") },
        });
        if (page.total !== null && page.total > page.records.length) {
          logger.warn("export filter matched more rows than one request returns", {
            year,
            commodity: commodity.key,
            total: page.total,
          });
        }
        run.rowsFetched += page.records.length;
        const rejects = [];
        for (const raw of page.records) {
          const result = normalizeExportRow(raw);
          if (!result.ok) rejects.push(result.reject);
          else if (result.value.commodityKey === commodity.key) yearRecords.push(result.value);
        }
        await run.reject(rejects);
      }

      // New countries.
      const newCountries = [...new Set(yearRecords.map((r) => r.country))].filter((c) => !countryIds.has(c));
      if (newCountries.length > 0) {
        const inserted = await db
          .insert(countries)
          .values(
            newCountries.map((name) => {
              const displayName = countryDisplayName(name);
              return { name, displayName, slug: uniqueSlug(displayName, countrySlugs) };
            }),
          )
          .onConflictDoNothing()
          .returning({ id: countries.id, name: countries.name });
        inserted.forEach((r) => countryIds.set(r.name, r.id));
      }

      // Deduplicate (a commodity/country pair appears once per year).
      const rows = new Map<string, typeof exportsAnnual.$inferInsert>();
      for (const r of yearRecords) {
        const exportCommodityId = commodityIds.get(r.commodityKey)!;
        const countryId = countryIds.get(r.country)!;
        rows.set(`${exportCommodityId}|${countryId}`, {
          year,
          exportCommodityId,
          countryId,
          quantity: r.quantity === null ? null : String(r.quantity),
          unit: r.unit,
          valueUsdMillion: String(r.valueUsdMillion),
          source: EXPORT_SOURCE,
        });
      }

      await db.transaction(async (tx) => {
        const values = [...rows.values()];
        for (let i = 0; i < values.length; i += 500) {
          await tx
            .insert(exportsAnnual)
            .values(values.slice(i, i + 500))
            .onConflictDoUpdate({
              target: [
                exportsAnnual.year,
                exportsAnnual.exportCommodityId,
                exportsAnnual.countryId,
                exportsAnnual.source,
              ],
              set: {
                quantity: sql`excluded.quantity`,
                unit: sql`excluded.unit`,
                valueUsdMillion: sql`excluded.value_usd_million`,
                updatedAt: sql`now()`,
              },
            });
        }
        // All-country totals: value always; quantity only when every row uses one unit.
        await tx.execute(sql`
          insert into exports_annual (year, export_commodity_id, country_id, quantity, unit, value_usd_million, source)
          select year, export_commodity_id, null,
                 case when count(distinct unit) = 1 then sum(quantity) end,
                 case when count(distinct unit) = 1 then min(unit) end,
                 sum(value_usd_million), ${EXPORT_TOTAL_SOURCE}
          from exports_annual
          where year = ${year} and source = ${EXPORT_SOURCE}
          group by year, export_commodity_id
          on conflict (year, export_commodity_id, country_id, source) do update set
            quantity = excluded.quantity, unit = excluded.unit, value_usd_million = excluded.value_usd_million, updated_at = now()`);
        run.rowsUpserted += values.length;
      });

      logger.info("export year ingested", { year, rows: rows.size });
      await run.markDone(partitionKey);
    }

    await run.finish("success");
    return {
      runId: run.id,
      upserted: run.rowsUpserted,
      rejected: run.rowsRejected,
      years: years.map((y) => y.year),
    };
  } catch (error) {
    await run.finish("failed", error);
    throw error;
  }
}

async function ensureExportCommodities(db: Db): Promise<Map<string, number>> {
  const taken = new Set(
    (await db.execute<{ slug: string }>(sql`select slug from export_commodities`)).rows.map((r) => r.slug),
  );
  const existing = new Set(
    (await db.execute<{ source_name: string }>(sql`select source_name from export_commodities`)).rows.map(
      (r) => r.source_name,
    ),
  );
  const missing = exportCommodityList.commodities.filter((c) => !existing.has(c.key));
  if (missing.length > 0) {
    await db
      .insert(exportCommodities)
      .values(
        missing.map((c) => ({
          sourceName: c.key,
          displayName: c.displayName,
          slug: uniqueSlug(c.displayName, taken),
        })),
      )
      .onConflictDoNothing();
  }
  const rows = await db.execute<{ id: number; source_name: string }>(
    sql`select id, source_name from export_commodities`,
  );
  return new Map(rows.rows.map((r) => [exportKey(r.source_name), r.id]));
}
