import { NextResponse, type NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { isCronAuthorized } from "@/lib/auth/basic";
import { todayInIst } from "@/lib/dates";
import { getDb } from "@/lib/db";
import { buildRollups, daysBefore } from "@/lib/ingest/rollups";
import { recalculateTiers } from "@/lib/tiers";

export const maxDuration = 60;

/**
 * Daily cron (SPEC §6.7): rebuilds the last 8 days of rollups, and on Mondays recalculates
 * commodity tiers. Heavier rollups and retention run in the GitHub Actions ingest workflow.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = getDb();
  const today = todayInIst();
  const rollups = await buildRollups(db, daysBefore(today, 8), today);

  const isMonday = new Date(`${today}T00:00:00Z`).getUTCDay() === 1;
  let tiers: { counts: Record<number, number>; changes: number } | null = null;
  if (isMonday) {
    const latest = (
      await db.execute<{ d: string | null }>(
        sql`select max(arrival_date)::text as d from prices_market_daily`,
      )
    ).rows[0]?.d;
    if (latest) {
      const result = await recalculateTiers(db, latest);
      tiers = { counts: result.counts, changes: result.changes.length };
    }
  }
  return NextResponse.json({ ok: true, rollups, tiers });
}
