import Link from "next/link";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { formatDataDate } from "@/lib/dates";
import type { CropRow } from "@/lib/queries/crop";

/** Tier 1: latest published brief. Tier 2/3: prompt to ask (SPEC §8.2). */
export async function LatestBrief({ crop }: { crop: CropRow }) {
  if (crop.tier !== 1) {
    return (
      <p>
        <Link href={`/ask?crop=${crop.slug}`} className="underline">
          Ask Mandiport about {crop.name.toLowerCase()}
        </Link>{" "}
        – for example, “Where was {crop.name.toLowerCase()} priced highest this week?” Answers use only the
        official data on this site.
      </p>
    );
  }
  const rows = await getDb().execute<{ week: string; headline: string; excerpt: string }>(sql`
    select week_start::text as week, headline, left(regexp_replace(body_md, '[#*_>]', '', 'g'), 240) as excerpt
    from ai_briefs where commodity_id = ${crop.id} and status = 'published' and language = 'en'
    order by week_start desc limit 1`);
  const brief = rows.rows[0];
  if (!brief) {
    return (
      <p>
        No weekly brief has been published for {crop.name.toLowerCase()} yet.{" "}
        <Link href={`/ask?crop=${crop.slug}`} className="underline">
          Ask a question about {crop.name.toLowerCase()} instead
        </Link>
        .
      </p>
    );
  }
  return (
    <article className="space-y-2">
      <p className="text-sm font-semibold">
        AI-assisted summary of official data · week of {formatDataDate(brief.week)}
      </p>
      <h3>{brief.headline}</h3>
      <p>{brief.excerpt}…</p>
      <Link href={`/briefs/${crop.slug}/${brief.week}`} className="underline">
        Read the full brief
      </Link>
    </article>
  );
}
