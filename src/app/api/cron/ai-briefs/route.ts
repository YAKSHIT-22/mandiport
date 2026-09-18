import { NextResponse, type NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { buildBriefFacts, generateBrief, saveDraftBrief } from "@/lib/ai/briefs";
import { isCronAuthorized } from "@/lib/auth/basic";
import { todayInIst } from "@/lib/dates";
import { getDb } from "@/lib/db";

export const maxDuration = 60;

/**
 * Weekly briefs for Tier 1 commodities, Mondays only (SPEC §6.7). Small batches with resume:
 * crops that already have a brief for the week are skipped, so repeated runs make progress.
 */
const BATCH = 8;

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const today = todayInIst();
  const force = request.nextUrl.searchParams.get("force") === "1";
  if (!force && new Date(`${today}T00:00:00Z`).getUTCDay() !== 1) {
    return NextResponse.json({ ok: true, skipped: "not Monday" });
  }

  const db = getDb();
  const asOf = (
    await db.execute<{ d: string | null }>(
      sql`select max(arrival_date)::text as d from prices_national_daily`,
    )
  ).rows[0]?.d;
  if (!asOf) return NextResponse.json({ ok: true, skipped: "no price data" });

  const crops = await db.execute<{ id: number; slug: string; name: string }>(sql`
    select c.id, c.slug, c.display_name as name from commodities c
    where c.tier = 1
      and not exists (
        select 1 from ai_briefs b
        where b.commodity_id = c.id and b.week_start = date_trunc('week', ${asOf}::date)::date and b.language = 'en'
      )
    order by c.markets_reporting_90d desc limit ${BATCH}`);

  const written: string[] = [];
  for (const crop of crops.rows) {
    const facts = await buildBriefFacts(db, crop.id, crop.name, asOf);
    const brief = await generateBrief(facts);
    if (!brief) continue;
    await saveDraftBrief(db, crop.id, brief);
    written.push(crop.slug);
  }
  return NextResponse.json({ ok: true, remaining: crops.rows.length - written.length, written });
}
