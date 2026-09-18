import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { EmptyState, SourceNote } from "@/components/data/meta";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { getDb } from "@/lib/db";
import { formatDataDate } from "@/lib/dates";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 21600;

export const metadata: Metadata = pageMetadata({
  title: "Weekly mandi market briefs",
  description:
    "Short weekly summaries of mandi price movements for India's most traded crops, written from official data and reviewed before publishing.",
  path: "/briefs",
});

export default async function BriefsPage() {
  const rows = await getDb().execute<{ slug: string; name: string; week: string; headline: string }>(sql`
    select c.slug, c.display_name as name, b.week_start::text as week, b.headline
    from ai_briefs b join commodities c on c.id = b.commodity_id
    where b.status = 'published' and b.language = 'en'
    order by b.week_start desc, c.markets_reporting_90d desc limit 60`);

  return (
    <main className="container-mp space-y-6 py-6">
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Briefs", path: "/briefs" },
        ]}
      />
      <h1>Weekly briefs</h1>
      <p className="prose-mp">
        Every Monday we summarise the week&rsquo;s price movement for the most traded crops. Each brief is
        written by a language model from figures in our database, and reviewed by a person before it is
        published. Briefs describe what happened; they never predict prices.
      </p>
      {rows.rows.length === 0 ? (
        <EmptyState title="No briefs have been published yet">
          Briefs appear here once the first week of data has been summarised and reviewed.{" "}
          <Link href="/crops" className="underline">
            Browse crop prices
          </Link>{" "}
          in the meantime.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.rows.map((b) => (
            <li key={`${b.slug}-${b.week}`}>
              <Link
                href={`/briefs/${b.slug}/${b.week}`}
                className="bg-card hover:border-primary flex h-full flex-col rounded-lg border p-4"
              >
                <span className="font-heading font-semibold">{b.headline}</span>
                <span className="text-muted-foreground mt-2 text-sm">
                  {b.name} · week of {formatDataDate(b.week)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <SourceNote datasets={["mandiVariety", "mandiDaily"]} />
    </main>
  );
}
