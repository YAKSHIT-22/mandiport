import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, Compass, IndianRupee, MessageSquare, Ruler, Ship } from "lucide-react";
import { sql } from "drizzle-orm";
import { CategoryArt } from "@/components/art/category-art";
import { MandiScene } from "@/components/art/mandi-scene";
import { ToolArt, type ToolArtName } from "@/components/art/tool-art";
import { EmptyState, SourceNote } from "@/components/data/meta";
import { SearchBox } from "@/components/site/search-box";
import { SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/lib/db";
import { tryQuery } from "@/lib/db/safe";
import { formatDataDate } from "@/lib/dates";
import { format, getDict, getLocale } from "@/lib/i18n/dictionary";
import { categoryName, cropName } from "@/lib/i18n/names";
import type { Dictionary } from "@/content/i18n/en";
import type { Locale } from "@/lib/i18n/config";
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

function toolCards(t: Dictionary) {
  return [
    {
      href: "/tools/best-mandi",
      art: "best-mandi" as ToolArtName,
      label: t.footer.bestMandi,
      text: t.toolBlurbs.bestMandiShort,
      icon: Compass,
    },
    {
      href: "/tools/price-history",
      art: "price-history" as ToolArtName,
      label: t.footer.priceHistory,
      text: t.toolBlurbs.priceHistoryShort,
      icon: BarChart3,
    },
    {
      href: "/tools/msp-check",
      art: "msp-check" as ToolArtName,
      label: t.footer.mspCheck,
      text: t.toolBlurbs.mspShort,
      icon: IndianRupee,
    },
    {
      href: "/tools/export-destinations",
      art: "export-destinations" as ToolArtName,
      label: t.footer.exportDestinations,
      text: t.toolBlurbs.exportsShort,
      icon: Ship,
    },
    {
      href: "/tools/unit-converter",
      art: "unit-converter" as ToolArtName,
      label: t.footer.unitConverter,
      text: t.toolBlurbs.unitsShort,
      icon: Ruler,
    },
    {
      href: "/ask",
      art: "ask" as ToolArtName,
      label: t.chrome.askCta,
      text: t.toolBlurbs.askShort,
      icon: MessageSquare,
    },
  ];
}

function MoverRow({
  mover,
  direction,
  t,
  locale,
}: {
  mover: Mover;
  direction: "up" | "down";
  t: Dictionary;
  locale: Locale;
}) {
  return (
    <li className="border-b last:border-0">
      <Link
        href={`/crops/${mover.slug}`}
        className="hover:bg-accent flex min-h-14 flex-wrap items-baseline justify-between gap-x-4 py-2"
      >
        <span className="font-semibold">{cropName(mover.slug, mover.name, locale)}</span>
        <span className="figures text-right">
          <strong>{formatRupees(mover.latest)}</strong>{" "}
          <span className={direction === "up" ? "text-rise" : "text-fall"}>
            <span aria-hidden="true">{direction === "up" ? "▲" : "▼"}</span>
            <span className="sr-only">{direction === "up" ? t.common.up : t.common.down}</span>{" "}
            {formatPercent(mover.percent)}
          </span>
          <span className="text-muted-foreground block text-sm font-normal">
            {format(t.home.moverFrom, {
              price: formatRupees(mover.previous),
              date: formatDataDate(mover.previousDate, locale),
            })}
          </span>
        </span>
      </Link>
    </li>
  );
}

export default async function HomePage() {
  const t = await getDict();
  const locale = await getLocale();
  const TOOLS = toolCards(t);
  const [categories, movers, latestDate, stats, briefs] = await Promise.all([
    tryQuery("home.categories", () => getCategories(), []),
    tryQuery("home.movers", () => getBiggestMovers(5, 10), { up: [], down: [] }),
    tryQuery("home.latestDate", () => getLatestDataDate(), null),
    tryQuery("home.stats", () => getSiteStats(), { commodities: 0, markets: 0, states: 0, days: 0 }),
    tryQuery(
      "home.briefs",
      async () =>
        (
          await getDb().execute<{ slug: string; name: string; week: string; headline: string }>(sql`
      select c.slug, c.display_name as name, b.week_start::text as week, b.headline
      from ai_briefs b join commodities c on c.id = b.commodity_id
      where b.status = 'published' and b.language = 'en' order by b.week_start desc, c.tier, c.display_name limit 6`)
        ).rows,
      [] as { slug: string; name: string; week: string; headline: string }[],
    ),
  ]);

  return (
    <main>
      <section className="from-accent/70 to-background border-b bg-gradient-to-b">
        <div className="container-mp grid items-center gap-8 py-12 sm:py-16 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="eyebrow">
              <span className="bg-primary size-1.5 rounded-full" aria-hidden="true" /> {t.home.eyebrow}
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl leading-[1.05] font-bold sm:text-5xl">
              {t.home.titleLead} <span className="text-primary">{t.home.titleAccent}</span>
            </h1>
            <p className="text-muted-foreground mt-5 max-w-xl text-lg">{t.home.intro}</p>
            <div className="mt-7 max-w-xl">
              <SearchBox
                labels={{
                  placeholder: t.chrome.searchPlaceholder,
                  label: t.search.label,
                  search: t.chrome.search,
                  results: t.search.results,
                  notResponding: t.search.notResponding,
                  noMatches: t.search.noMatches,
                }}
              />
            </div>
            <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
              {[
                [t.home.statCommodities, formatNumber(stats.commodities)],
                [t.home.statMarkets, formatNumber(stats.markets)],
                [t.home.statStates, formatNumber(stats.states)],
                [t.home.statDays, formatNumber(stats.days)],
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
          {/* Decorative: the yard and the port, the two ends of the trade this site covers. */}
          <MandiScene className="hidden max-w-lg justify-self-end lg:block" />
        </div>
      </section>

      <div className="container-mp space-y-12 py-12">
        <nav aria-labelledby="categories-heading">
          <h2 id="categories-heading" className="sr-only">
            {t.home.categoriesHeading}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {categories
              .filter((c) => c.count > 0)
              .map((c) => (
                <li key={c.slug}>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/categories/${c.slug}`}>
                      <CategoryArt slug={c.slug} className="size-5" />
                      {categoryName(c.slug, c.name, locale)}{" "}
                      <span className="text-muted-foreground">{c.count}</span>
                    </Link>
                  </Button>
                </li>
              ))}
          </ul>
        </nav>

        <section aria-labelledby="movers-heading">
          <SectionHeading
            id="movers-heading"
            eyebrow={
              latestDate ? format(t.common.dataFrom, { date: formatDataDate(latestDate, locale) }) : undefined
            }
            title={t.home.moversTitle}
            description={t.home.moversDescription}
            action={
              <Button variant="outline" size="sm" asChild>
                <Link href="/crops">
                  {t.home.allCrops} <ArrowRight />
                </Link>
              </Button>
            }
          />
          {movers.up.length + movers.down.length === 0 ? (
            <EmptyState title={t.home.moversEmpty}>{t.home.moversEmptyBody}</EmptyState>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-rise">{t.home.rising}</CardTitle>
                </CardHeader>
                <CardContent>
                  {movers.up.length ? (
                    <ul>
                      {movers.up.map((m) => (
                        <MoverRow key={m.slug} mover={m} direction="up" t={t} locale={locale} />
                      ))}
                    </ul>
                  ) : (
                    <p>{t.home.noRising}</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-fall">{t.home.falling}</CardTitle>
                </CardHeader>
                <CardContent>
                  {movers.down.length ? (
                    <ul>
                      {movers.down.map((m) => (
                        <MoverRow key={m.slug} mover={m} direction="down" t={t} locale={locale} />
                      ))}
                    </ul>
                  ) : (
                    <p>{t.home.noFalling}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </section>

        <section aria-labelledby="tools-heading">
          <SectionHeading id="tools-heading" eyebrow={t.home.toolsEyebrow} title={t.home.toolsTitle} />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map((t) => (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className="bg-card hover:border-primary block h-full overflow-hidden rounded-lg border transition-colors"
                >
                  <span className="bg-accent/60 block border-b px-6 py-3">
                    <ToolArt name={t.art} className="max-h-24" />
                  </span>
                  <span className="flex gap-3 p-4">
                    <t.icon className="text-primary mt-1 size-5 shrink-0" aria-hidden="true" />
                    <span>
                      <span className="font-heading block font-semibold">{t.label}</span>
                      <span className="text-muted-foreground block text-sm">{t.text}</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="briefs-heading">
          <SectionHeading
            id="briefs-heading"
            eyebrow={t.home.briefsEyebrow}
            title={t.home.briefsTitle}
            description={t.home.briefsDescription}
          />
          {briefs.length === 0 ? (
            <p>
              {t.home.briefsEmpty}{" "}
              <Link href="/briefs" className="underline">
                {t.home.briefsEmptyLink}
              </Link>
              .
            </p>
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
        </section>

        <SourceNote datasets={["mandiVariety", "mandiDaily"]} />
      </div>
    </main>
  );
}
