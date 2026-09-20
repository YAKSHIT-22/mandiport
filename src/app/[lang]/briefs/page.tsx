import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { format, getDict, getLocale } from "@/lib/i18n/dictionary";
import { cropName } from "@/lib/i18n/names";
import { EmptyState, SourceNote } from "@/components/data/meta";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { getDb } from "@/lib/db";
import { tryQuery } from "@/lib/db/safe";
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
  const t = await getDict();
  const locale = await getLocale();
  const briefs = await tryQuery(
    "briefs.list",
    async () =>
      (
        await getDb().execute<{ slug: string; name: string; week: string; headline: string }>(sql`
    select c.slug, c.display_name as name, b.week_start::text as week, b.headline
    from ai_briefs b join commodities c on c.id = b.commodity_id
    where b.status = 'published' and b.language = 'en'
    order by b.week_start desc, c.markets_reporting_90d desc limit 60`)
      ).rows,
    [] as { slug: string; name: string; week: string; headline: string }[],
  );

  return (
    <main className="container-mp space-y-6 py-6">
      <Breadcrumbs
        crumbs={[
          { name: t.chrome.home, path: "/" },
          { name: t.nav.briefs, path: "/briefs" },
        ]}
      />
      <h1>{t.pages.briefsTitle}</h1>
      <p className="prose-mp">{t.pages.briefsIntro}</p>
      {briefs.length === 0 ? (
        <EmptyState title={t.pages.briefsEmptyTitle}>
          {t.pages.briefsEmptyBodyBefore}{" "}
          <Link href="/crops" className="underline">
            {t.pages.briefsEmptyLink}
          </Link>{" "}
          {t.pages.briefsEmptyBodyAfter}
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {briefs.map((b) => (
            <li key={`${b.slug}-${b.week}`}>
              <Link
                href={`/briefs/${b.slug}/${b.week}`}
                className="bg-card hover:border-primary flex h-full flex-col rounded-lg border p-4"
              >
                <span className="font-heading font-semibold">{b.headline}</span>
                <span className="text-muted-foreground mt-2 text-sm">
                  {cropName(b.slug, b.name, locale)} ·{" "}
                  {format(t.home.briefWeekOf, { date: formatDataDate(b.week, locale) })}
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
