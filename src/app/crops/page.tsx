import type { Metadata } from "next";
import Link from "next/link";
import { CategoryArt } from "@/components/art/category-art";
import { SourceNote } from "@/components/data/meta";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { CropDirectory } from "@/components/site/crop-directory";
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
  const [crops, categories] = await Promise.all([
    tryQuery("crops.all", () => getAllCrops(), []),
    tryQuery("crops.categories", () => getCategories(), []),
  ]);
  return (
    <main className="container-mp space-y-6 py-6">
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Crops", path: "/crops" },
        ]}
      />
      <h1>All crops</h1>
      <p className="prose-mp">
        {crops.length} commodities have been reported by Indian mandis in the data we collect. The most widely
        traded are listed first; the full list is below, A to Z. Crops reported by only a few markets are
        marked “limited data”.
      </p>
      <nav aria-labelledby="browse-categories">
        <h2 id="browse-categories" className="font-heading text-lg font-semibold">
          Browse by category
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
                    <span className="text-muted-foreground block text-sm">{c.count} crops</span>
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      </nav>
      <CropDirectory crops={crops} categories={categories.filter((c) => c.count > 0)} />
      <SourceNote datasets={["mandiVariety", "mandiDaily"]} />
    </main>
  );
}
