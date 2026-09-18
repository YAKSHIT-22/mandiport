import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SourceNote } from "@/components/data/meta";
import { Section } from "@/components/data/panels";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { CATEGORY_OVERVIEWS } from "@/content/categories";
import { formatDataDate } from "@/lib/dates";
import { formatPercent, formatRupees } from "@/lib/format";
import { tryQuery } from "@/lib/db/safe";
import { getAllCrops, getBiggestMovers, getCategories } from "@/lib/queries/site";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 21600;
export const dynamicParams = false;

export async function generateStaticParams() {
  return Object.keys(CATEGORY_OVERVIEWS).map((category) => ({ category }));
}

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const cats = await getCategories().catch(() => []);
  const cat = cats.find((c) => c.slug === category);
  const name = cat?.name ?? category;
  return pageMetadata({
    title: `${name} mandi prices in India`,
    description: `Daily mandi prices for ${name.toLowerCase()} in India: ${cat?.count ?? ""} commodities with trends, top markets and price moves from official data.`,
    path: `/categories/${category}`,
  });
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const overview = CATEGORY_OVERVIEWS[category];
  const [cats, allCrops] = await Promise.all([
    tryQuery("category.categories", () => getCategories(), []),
    tryQuery("category.crops", () => getAllCrops(), []),
  ]);
  // With no data yet (a fresh database), still render the category's written overview.
  const cat = cats.find((c) => c.slug === category) ?? { slug: category, name: category, count: 0 };
  if (!overview) notFound();
  const crops = allCrops
    .filter((c) => c.categorySlug === category)
    .sort((a, b) => a.tier - b.tier || b.markets - a.markets);
  const movers = await tryQuery(
    "category.movers",
    () => getBiggestMovers(5, 5, category === "others" ? undefined : category),
    { up: [], down: [] },
  );
  const moverList =
    category === "others"
      ? []
      : [...movers.up, ...movers.down].sort((a, b) => Math.abs(b.percent) - Math.abs(a.percent)).slice(0, 6);

  return (
    <main className="container-mp space-y-8 py-6">
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Crops", path: "/crops" },
          { name: cat.name, path: `/categories/${category}` },
        ]}
      />
      <h1>{cat.name}</h1>
      <div className="prose-mp">
        {overview.intro.map((p) => (
          <p key={p.slice(0, 30)}>{p}</p>
        ))}
      </div>
      {moverList.length > 0 && (
        <Section id="movers" title="Biggest price moves this week">
          <ul>
            {moverList.map((m) => (
              <li key={m.slug} className="border-border border-b py-2">
                <Link href={`/crops/${m.slug}`} className="font-semibold underline">
                  {m.name}
                </Link>{" "}
                <span className="figures">
                  {formatRupees(m.latest)} on {formatDataDate(m.latestDate)},{" "}
                  <span className={m.percent > 0 ? "text-rise" : "text-fall"}>
                    {m.percent > 0 ? "▲ up" : "▼ down"} {formatPercent(m.percent)}
                  </span>{" "}
                  from {formatRupees(m.previous)} on {formatDataDate(m.previousDate)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section id="crops" title={`${crops.length} crops in this category`}>
        <ul className="xs:grid-cols-2 grid grid-cols-1 gap-x-6 md:grid-cols-3">
          {crops.map((c) => (
            <li key={c.slug} className="border-border border-b">
              <Link
                href={`/crops/${c.slug}`}
                className="flex min-h-11 flex-wrap items-center gap-x-2 underline"
              >
                {c.name}
                {c.tier === 3 && <span className="text-muted-foreground text-sm">limited data</span>}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      <SourceNote datasets={["mandiVariety", "mandiDaily"]} />
    </main>
  );
}
