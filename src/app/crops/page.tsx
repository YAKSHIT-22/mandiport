import type { Metadata } from "next";
import { SourceNote } from "@/components/data/meta";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { CropDirectory } from "@/components/site/crop-directory";
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
  const [crops, categories] = await Promise.all([getAllCrops(), getCategories()]);
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
      <CropDirectory crops={crops} categories={categories.filter((c) => c.count > 0)} />
      <SourceNote datasets={["mandiVariety", "mandiDaily"]} />
    </main>
  );
}
