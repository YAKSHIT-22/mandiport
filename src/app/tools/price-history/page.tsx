import type { Metadata } from "next";
import { ToolArt } from "@/components/art/tool-art";
import { SourceNote } from "@/components/data/meta";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { getCropOptions } from "@/lib/queries/tools";
import { pageMetadata } from "@/lib/seo/metadata";
import { PriceHistoryTool } from "./tool";

export const revalidate = 21600;

export const metadata: Metadata = pageMetadata({
  title: "Price history and best month to sell",
  description:
    "See daily price trends, monthly averages and the months that have historically paid most for any crop and mandi.",
  path: "/tools/price-history",
});

type Props = { searchParams: Promise<{ crop?: string; state?: string; market?: string }> };

export default async function PriceHistoryPage({ searchParams }: Props) {
  const [params, crops] = await Promise.all([searchParams, getCropOptions()]);
  return (
    <main className="container-mp space-y-6 py-6">
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Tools", path: "/tools" },
          { name: "Price history", path: "/tools/price-history" },
        ]}
      />
      <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <h1>Price history and best month to sell</h1>
          <p className="prose-mp">
            Pick a crop, and narrow to a state or a single market. Monthly averages show which months have
            paid most in the past. They describe the past only and are not a forecast.
          </p>
        </div>
        <ToolArt name="price-history" className="hidden w-52 self-center sm:block" />
      </div>
      <PriceHistoryTool crops={crops} initial={params} />
      <SourceNote datasets={["mandiVariety", "mandiDaily"]} />
    </main>
  );
}
