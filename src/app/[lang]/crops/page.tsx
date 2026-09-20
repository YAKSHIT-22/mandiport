import type { Metadata } from "next";
import Link from "next/link";
import { CategoryArt } from "@/components/art/category-art";
import { SourceNote } from "@/components/data/meta";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { CropDirectory } from "@/components/site/crop-directory";
import { format, getDict, getLocale } from "@/lib/i18n/dictionary";
import { categoryName, cropName } from "@/lib/i18n/names";
import { tryQuery } from "@/lib/db/safe";
import { getAllCrops, getCategories } from "@/lib/queries/site";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 21600;

export const metadata: Metadata = pageMetadata({
  title: "All crops: mandi prices A to Z",
  description:
    "Every commodity reported by Indian mandis, from ajwain to wheat, with daily prices, trends and markets from official data.",
  path: "/crops",
});

export default async function CropsPage() {
  const t = await getDict();
  const locale = await getLocale();
  const [allCrops, allCategories] = await Promise.all([
    tryQuery("crops.all", () => getAllCrops(), []),
    tryQuery("crops.categories", () => getCategories(), []),
  ]);
  const crops = allCrops.map((c) => ({ ...c, name: cropName(c.slug, c.name, locale) }));
  const categories = allCategories.map((c) => ({ ...c, name: categoryName(c.slug, c.name, locale) }));
  return (
    <main className="container-mp space-y-6 py-6">
      <Breadcrumbs
        crumbs={[
          { name: t.chrome.home, path: "/" },
          { name: t.nav.crops, path: "/crops" },
        ]}
      />
      <h1>{t.crops.title}</h1>
      <p className="prose-mp">{format(t.crops.intro, { count: crops.length })}</p>
      <nav aria-labelledby="browse-categories">
        <h2 id="browse-categories" className="font-heading text-lg font-semibold">
          {t.crops.browseByCategory}
        </h2>
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories
            .filter((c) => c.count > 0)
            .map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/categories/${c.slug}`}
                  className="bg-card hover:border-primary flex h-full min-h-14 items-center gap-3 rounded-lg border p-3 transition-colors"
                >
                  <CategoryArt slug={c.slug} className="size-9 shrink-0" />
                  <span>
                    <span className="font-heading block font-semibold">{c.name}</span>
                    <span className="text-muted-foreground block text-sm">
                      {format(t.crops.cropCount, { count: c.count })}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      </nav>
      <CropDirectory
        crops={crops}
        categories={categories.filter((c) => c.count > 0)}
        labels={{
          filterByName: t.search.filterByName,
          filterPlaceholder: t.search.filterPlaceholder,
          category: t.search.category,
          allCategories: t.search.allCategories,
          showingOf: t.common.showingOf,
          mostTraded: t.search.mostTraded,
          aToZ: t.search.aToZ,
          noMatch: t.crops.noMatch,
          limitedData: t.common.limitedData,
        }}
      />
      <SourceNote datasets={["mandiVariety", "mandiDaily"]} />
    </main>
  );
}
