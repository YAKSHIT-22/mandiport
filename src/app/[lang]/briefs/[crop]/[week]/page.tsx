import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "drizzle-orm";
import { SourceNote } from "@/components/data/meta";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { BriefViewTracker } from "@/components/site/view-tracker";
import { AdSlot } from "@/components/site/ad-slot";
import { getDb } from "@/lib/db";
import { formatDataDate } from "@/lib/dates";
import { formatNumber, formatPercent, formatRupees } from "@/lib/format";
import type { BriefFacts } from "@/lib/ai/briefs";
import { articleJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 21600;
export const dynamicParams = true;

type Props = { params: Promise<{ crop: string; week: string }> };

async function load(params: Props["params"]) {
  const { crop, week } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) return null;
  const rows = await getDb().execute<{
    headline: string;
    body: string;
    facts: BriefFacts;
    week: string;
    published: string | null;
    updated: string;
    name: string;
    slug: string;
    model: string;
  }>(sql`
    select b.headline, b.body_md as body, b.facts_json as facts, b.week_start::text as week,
           b.published_at::date::text as published, b.updated_at::date::text as updated,
           c.display_name as name, c.slug, b.model_id as model
    from ai_briefs b join commodities c on c.id = b.commodity_id
    where c.slug = ${crop} and b.week_start = ${week}::date and b.status = 'published' and b.language = 'en'`);
  return rows.rows[0] ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const brief = await load(params);
  if (!brief) return { title: "Brief not found", robots: { index: false } };
  return pageMetadata({
    title: brief.headline,
    description: `${brief.name} market brief for the week of ${formatDataDate(brief.week)}: price movement, top markets and what the official data shows.`,
    path: `/briefs/${brief.slug}/${brief.week}`,
    type: "article",
  });
}

export default async function BriefPage({ params }: Props) {
  const brief = await load(params);
  if (!brief) notFound();
  const facts = brief.facts;
  const path = `/briefs/${brief.slug}/${brief.week}`;

  return (
    <main className="container-mp space-y-6 py-6">
      <BriefViewTracker crop={brief.slug} week={brief.week} />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Briefs", path: "/briefs" },
          { name: `${brief.name}, ${formatDataDate(brief.week)}`, path },
        ]}
      />
      <article className="space-y-5">
        <header className="space-y-2">
          <h1>{brief.headline}</h1>
          <p className="text-muted-foreground text-sm">
            {brief.name} · week of {formatDataDate(brief.week)} ·{" "}
            <Link href={`/crops/${brief.slug}`} className="underline">
              See live {brief.name.toLowerCase()} prices
            </Link>
          </p>
          <p className="border-highlight bg-muted border-l-4 px-3 py-2 text-sm">
            AI-assisted summary of official data, reviewed by Mandiport.
          </p>
        </header>

        {facts.latest && (
          <dl className="bg-card grid gap-4 rounded-lg border p-4 sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground text-sm">National median</dt>
              <dd className="figures text-price-lg font-bold">{formatRupees(facts.latest.price)}</dd>
              <dd className="text-muted-foreground text-sm">
                per quintal on {formatDataDate(facts.latest.date)}, {formatNumber(facts.latest.markets)}{" "}
                markets
              </dd>
            </div>
            {facts.weekChangePercent !== null && (
              <div>
                <dt className="text-muted-foreground text-sm">Change over a week</dt>
                <dd
                  className={`figures text-price-lg font-bold ${facts.weekChangePercent >= 0 ? "text-rise" : "text-fall"}`}
                >
                  <span aria-hidden="true">{facts.weekChangePercent >= 0 ? "▲" : "▼"}</span>{" "}
                  {formatPercent(facts.weekChangePercent)}
                </dd>
              </div>
            )}
            {facts.msp && (
              <div>
                <dt className="text-muted-foreground text-sm">Against MSP {formatRupees(facts.msp.price)}</dt>
                <dd
                  className={`figures text-price-lg font-bold ${facts.msp.gapPercent >= 0 ? "text-rise" : "text-fall"}`}
                >
                  {formatPercent(facts.msp.gapPercent)} {facts.msp.gapPercent >= 0 ? "above" : "below"}
                </dd>
              </div>
            )}
          </dl>
        )}

        <div className="prose-mp space-y-4">
          {brief.body.split(/\n{2,}/).map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </div>

        <AdSlot position="brief-end" />
      </article>

      <SourceNote
        datasets={[
          "mandiVariety",
          "mandiDaily",
          ...(facts.msp ? (["msp"] as const) : []),
          ...(facts.exports ? (["exports"] as const) : []),
        ]}
      />
      <JsonLd
        data={articleJsonLd({
          headline: brief.headline,
          description: `${brief.name} weekly market brief for ${formatDataDate(brief.week)}.`,
          path,
          datePublished: brief.published ?? brief.updated,
          dateModified: brief.updated,
        })}
      />
    </main>
  );
}
