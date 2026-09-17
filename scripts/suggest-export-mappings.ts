/** Suggests mandi → export commodity mappings (SPEC §6.6). Never overwrites reviewed rows or HS codes. */
import { sql } from "drizzle-orm";
import { cropMapping } from "@/lib/db/schema";
import { suggestExportMappings } from "@/lib/mappings/suggest";
import { logger, runScript } from "./lib/context";

runScript("suggest-export-mappings", async ({ db }) => {
  const exportRows = await db.execute<{ id: number; source_name: string; display_name: string }>(
    sql`select id, source_name, display_name from export_commodities`,
  );
  if (exportRows.rows.length === 0) throw new Error("No export commodities; run pnpm ingest:exports first");
  const exportIds = new Map(exportRows.rows.map((r) => [r.source_name, r.id]));
  const exportList = exportRows.rows.map((r) => ({ key: r.source_name, displayName: r.display_name }));

  const commodityRows = await db.execute<{ id: number; source_name: string; category: string | null }>(sql`
    select c.id, c.source_name, cat.slug as category from commodities c left join categories cat on cat.id = c.category_id`);

  let suggested = 0;
  for (const c of commodityRows.rows) {
    const candidates = suggestExportMappings(
      { sourceName: c.source_name, categorySlug: c.category },
      exportList,
    );
    for (const candidate of candidates.slice(0, 3)) {
      const result = await db
        .insert(cropMapping)
        .values({
          commodityId: c.id,
          exportCommodityId: exportIds.get(candidate.exportKey)!,
          confidence: String(candidate.confidence),
          notes: candidate.reason,
          status: "suggested",
          verified: false,
        })
        .onConflictDoUpdate({
          target: [cropMapping.commodityId, cropMapping.exportCommodityId],
          set: { confidence: sql`excluded.confidence`, notes: sql`excluded.notes`, updatedAt: sql`now()` },
          setWhere: sql`${cropMapping.status} = 'suggested'`,
        })
        .returning({ id: cropMapping.id });
      suggested += result.length;
    }
  }
  logger.info("mapping suggestions stored", { commodities: commodityRows.rows.length, suggested });
});
