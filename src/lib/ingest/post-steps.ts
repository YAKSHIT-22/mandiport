import { sql } from "drizzle-orm";
import { getEnv } from "@/env";
import { keysToInvalidate } from "@/lib/cache/keys";
import { getCache } from "@/lib/cache/store";
import { registerAfterIngestStep } from "./after-ingest";

/** Post-ingest steps (SPEC §6.7): invalidate Redis keys, then revalidate affected pages in batches. */

let registered = false;

export function registerDefaultPostIngestSteps() {
  if (registered) return;
  registered = true;

  registerAfterIngestStep("invalidate-cache", async ({ db, commodityIds, logger }) => {
    if (commodityIds.length === 0) return;
    const slugs = await db.execute<{ slug: string }>(
      sql`select slug from commodities where id = any(${`{${commodityIds.join(",")}}`}::int[])`,
    );
    const cache = await getCache();
    const keys = keysToInvalidate(slugs.rows.map((r) => r.slug));
    for (let i = 0; i < keys.length; i += 200) await cache.del(keys.slice(i, i + 200));
    logger.info("cache invalidated", { keys: keys.length, store: cache.kind });
  });

  registerAfterIngestStep("revalidate-pages", async ({ db, commodityIds, logger }) => {
    const env = getEnv();
    if (!env.CRON_SECRET || !env.NEXT_PUBLIC_SITE_URL || commodityIds.length === 0) {
      logger.info("page revalidation skipped (CRON_SECRET or site URL not set)");
      return;
    }
    const slugs = (
      await db.execute<{ slug: string }>(
        sql`select slug from commodities where id = any(${`{${commodityIds.join(",")}}`}::int[])`,
      )
    ).rows.map((r) => r.slug);
    for (let i = 0; i < slugs.length; i += 100) {
      const res = await fetch(`${env.NEXT_PUBLIC_SITE_URL}/api/revalidate`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${env.CRON_SECRET}` },
        body: JSON.stringify({ crops: slugs.slice(i, i + 100) }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`revalidate HTTP ${res.status}`);
    }
    logger.info("pages revalidated", { crops: slugs.length });
  });
}
