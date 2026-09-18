/**
 * Weekly briefs for Tier 1 commodities (SPEC §8.8). Saved as drafts for human review.
 *
 *   pnpm briefs:generate [--limit=40] [--as-of=YYYY-MM-DD] [--crop=onion]
 */
import { sql } from "drizzle-orm";
import { getEnv } from "@/env";
import { buildBriefFacts, generateBrief, saveDraftBrief } from "@/lib/ai/briefs";
import { translateToHindi, TranslationUnavailableError } from "@/lib/ai/sarvam";
import { tokensUsedToday } from "@/lib/ai/guards";
import { todayInIst } from "@/lib/dates";
import { arg, logger, runScript } from "./lib/context";

runScript("generate-ai-briefs", async ({ db }) => {
  const limit = Number(arg("limit") ?? 40);
  const cropFilter = arg("crop");
  const asOf =
    arg("as-of") ??
    (
      await db.execute<{ d: string | null }>(
        sql`select max(arrival_date)::text as d from prices_national_daily`,
      )
    ).rows[0]?.d ??
    todayInIst();

  const crops = await db.execute<{ id: number; slug: string; name: string }>(sql`
    select id, slug, display_name as name from commodities
    where tier = 1 ${cropFilter ? sql`and slug = ${cropFilter}` : sql``}
    order by markets_reporting_90d desc limit ${limit}`);

  let written = 0;
  let skipped = 0;
  for (const crop of crops.rows) {
    const facts = await buildBriefFacts(db, crop.id, crop.name, asOf);
    const brief = await generateBrief(facts);
    if (!brief) {
      skipped++;
      continue;
    }
    await saveDraftBrief(db, crop.id, brief);
    written++;

    // Optional Hindi draft (SPEC §8.8); not routed publicly until the i18n phase.
    if (getEnv().FEATURE_TRANSLATION) {
      try {
        const [headline, bodyMd] = await Promise.all([
          translateToHindi(brief.headline),
          translateToHindi(brief.bodyMd),
        ]);
        await saveDraftBrief(db, crop.id, { ...brief, headline, bodyMd }, "hi");
      } catch (error) {
        if (!(error instanceof TranslationUnavailableError)) throw error;
        logger.warn("Hindi translation unavailable", { crop: crop.slug });
      }
    }
    logger.info("draft brief written", { crop: crop.slug, week: facts.weekStart, headline: brief.headline });
  }
  logger.info("briefs finished", {
    crops: crops.rows.length,
    written,
    skipped,
    tokensToday: await tokensUsedToday(),
  });
});
