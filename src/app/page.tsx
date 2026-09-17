import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, Compass, IndianRupee, MessageSquare, Ruler, Ship } from "lucide-react";
import { sql } from "drizzle-orm";
import { EmptyState, SourceNote } from "@/components/data/meta";
import { SearchBox } from "@/components/site/search-box";
import { SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/lib/db";
import { formatDataDate } from "@/lib/dates";
import { formatNumber, formatPercent, formatRupees } from "@/lib/format";
import {
  getBiggestMovers,
  getCategories,
  getLatestDataDate,
  getSiteStats,
  type Mover,
} from "@/lib/queries/site";
import { pageMetadata } from "@/lib/seo/metadata";
import { SITE_DESCRIPTION } from "@/lib/seo/site";

export const revalidate = 21600;

export const metadata: Metadata = pageMetadata({
  title: "Mandiport: mandi prices and export demand, crop by crop",
  description: SITE_DESCRIPTION,
  path: "/",
});

const TOOLS = [
  {
    href: "/tools/best-mandi",
    label: "Best mandi to sell",
    text: "Compare take-home prices after transport.",
    icon: Compass,
  },
  {
    href: "/tools/price-history",
    label: "Price history",
    text: "Trends and monthly averages for any market.",
    icon: BarChart3,
  },
  {
    href: "/tools/msp-check",
    label: "MSP check",
    text: "Mandi prices against the support price.",
    icon: IndianRupee,
  },
  {
    href: "/tools/export-destinations",
    label: "Export destinations",
    text: "Which countries buy, and how that is changing.",
    icon: Ship,
  },
  {
    href: "/tools/unit-converter",
    label: "Unit converter",
    text: "Quintal, kg and tonne; rupees and dollars.",
    icon: Ruler,
  },
  {
    href: "/ask",
    label: "Ask Mandiport",
    text: "Plain answers from official data only.",
    icon: MessageSquare,
  },
];

function MoverRow({ mover, direction }: { mover: Mover; direction: "up" | "down" }) {
  return (
    <li className="border-b last:border-0">
      <Link
        href={`/crops/${mover.slug}`}
        className="hover:bg-accent flex min-h-14 flex-wrap items-baseline justify-between gap-x-4 py-2"
      >
        <span className="font-semibold">{mover.name}</span>
        <span className="figures text-right">
          <strong>{formatRupees(mover.latest)}</strong>{" "}
          <span className={direction === "up" ? "text-rise" : "text-fall"}>
            <span aria-hidden="true">{direction === "up" ? "▲" : "▼"}</span>
            <span className="sr-only">{direction === "up" ? "up" : "down"}</span>{" "}
            {formatPercent(mover.percent)}
          </span>
          <span className="text-muted-foreground block text-sm font-normal">
            from {formatRupees(mover.previous)} on {formatDataDate(mover.previousDate)}
          </span>
        </span>
      </Link>
    </li>
  );
}

export default async function HomePage() {
  const [categories, movers, latestDate, stats, briefs] = await Promise.all([
    getCategories(),
    getBiggestMovers(5, 10),
    getLatestDataDate(),
    getSiteStats(),
    getDb().execute<{ slug: string; name: string; week: string; headline: string }>(sql`
      select c.slug, c.display_name as name, b.week_start::text as week, b.headline
      from ai_briefs b join commodities c on c.id = b.commodity_id
      where b.status = 'published' and b.language = 'en' order by b.week_start desc, c.tier, c.display_name limit 6`),
  ]);

  return (
    <main>
      <section className="from-accent/70 to-background border-b bg-gradient-to-b">
        <div className="container-mp py-12 sm:py-16">
          <p className="eyebrow">
            <span className="bg-primary size-1.5 rounded-full" aria-hidden="true" /> Official Government of
            India data
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl leading-[1.05] font-bold sm:text-5xl">
            Mandi prices and export demand, <span className="text-primary">crop by crop.</span>
          </h1>
          <p className="text-muted-foreground mt-5 max-w-xl text-lg">
            Where a crop’s price is heading, where to sell it in India, and who buys it abroad — with the date
            every figure refers to.
          </p>
          <div className="mt-7 max-w-xl">
            <SearchBox />
          </div>
          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
            {[
              ["Commodities", formatNumber(stats.commodities)],
              ["Markets", formatNumber(stats.markets)],
              ["States and UTs", formatNumber(stats.states)],
              ["Days of price data", formatNumber(stats.days)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="font-heading text-muted-foreground text-[0.76rem] font-bold tracking-[0.12em] uppercase">
                  {label}
                </dt>
                <dd className="figures font-heading text-3xl font-bold">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="container-mp space-y-12 py-12">
        <nav aria-labelledby="categories-heading">
          <h2 id="categories-heading" className="sr-only">
            Categories
          </h2>
          <ul className="flex flex-wrap gap-2">
            {categories
              .filter((c) => c.count > 0)
              .map((c) => (
                <li key={c.slug}>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/categories/${c.slug}`}>
                      {c.name} <span className="text-muted-foreground">{c.count}</span>
                    </Link>
                  </Button>
                </li>
              ))}
          </ul>
        </nav>

        <section aria-labelledby="movers-heading">
          <SectionHeading
            id="movers-heading"
            eyebrow={latestDate ? `Data from ${formatDataDate(latestDate)}` : undefined}
            title="Biggest price moves"
            description="National median price against about a week earlier, for crops reported by at least 10 markets on both days."
            action={
              <Button variant="outline" size="sm" asChild>
                <Link href="/crops">
                  All crops <ArrowRight />
                </Link>
              </Button>
            }
          />
          {movers.up.length + movers.down.length === 0 ? (
            <EmptyState title="Not enough data for price moves yet">
              Moves appear once widely traded crops have a week of reports.
            </EmptyState>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-rise">Rising</CardTitle>
                </CardHeader>
                <CardContent>
                  {movers.up.length ? (
                    <ul>
                      {movers.up.map((m) => (
                        <MoverRow key={m.slug} mover={m} direction="up" />
                      ))}
                    </ul>
                  ) : (
                    <p>No rising crops.</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-fall">Falling</CardTitle>
                </CardHeader>
                <CardContent>
                  {movers.down.length ? (
                    <ul>
                      {movers.down.map((m) => (
                        <MoverRow key={m.slug} mover={m} direction="down" />
                      ))}
                    </ul>
                  ) : (
                    <p>No falling crops.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </section>

        <section aria-labelledby="tools-heading">
          <SectionHeading id="tools-heading" eyebrow="Built for selling decisions" title="Tools" />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map((t) => (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className="bg-card hover:border-primary flex h-full gap-3 rounded-lg border p-4 transition-colors"
                >
                  <t.icon className="text-primary mt-1 size-5 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="font-heading block font-semibold">{t.label}</span>
                    <span className="text-muted-foreground block text-sm">{t.text}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="briefs-heading">
          <SectionHeading
            id="briefs-heading"
            eyebrow="Reviewed before publishing"
            title="Latest weekly briefs"
            description="AI-assisted summaries of official data for the most traded crops."
          />
          {briefs.rows.length === 0 ? (
            <p>
              No briefs have been published yet.{" "}
              <Link href="/briefs" className="underline">
                See how briefs work
              </Link>
              .
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {briefs.rows.map((b) => (
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
        </section>

        <SourceNote datasets={["mandiVariety", "mandiDaily"]} />
      </div>
    </main>
  );
}
