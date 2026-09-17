import { sql } from "drizzle-orm";
import type { Db } from "@/lib/db";

/**
 * Makes market slugs unique within each state (market URLs are state-scoped). Renames later
 * duplicates to "<slug>-<district-slug>" (then a numeric suffix if still taken). Idempotent.
 */
export async function ensureUniqueMarketSlugsPerState(db: Db): Promise<number> {
  const dupes = await db.execute<{ id: number; slug: string; district_slug: string; state_id: number }>(sql`
    select m.id, m.slug, d.slug as district_slug, d.state_id
    from markets m join districts d on d.id = m.district_id
    where exists (
      select 1 from markets m2 join districts d2 on d2.id = m2.district_id
      where d2.state_id = d.state_id and m2.slug = m.slug and m2.id < m.id
    )
    order by m.id`);
  let renamed = 0;
  for (const row of dupes.rows) {
    const taken = new Set(
      (
        await db.execute<{ slug: string }>(sql`
          select m.slug from markets m join districts d on d.id = m.district_id where d.state_id = ${row.state_id}`)
      ).rows.map((r) => r.slug),
    );
    let candidate = `${row.slug}-${row.district_slug}`.slice(0, 90);
    for (let n = 2; taken.has(candidate); n++)
      candidate = `${row.slug}-${row.district_slug}-${n}`.slice(0, 90);
    await db.execute(sql`update markets set slug = ${candidate}, updated_at = now() where id = ${row.id}`);
    renamed++;
  }
  return renamed;
}
