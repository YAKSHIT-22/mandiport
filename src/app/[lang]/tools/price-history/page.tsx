import type { Metadata } from "next";
import { getDict, getLocale } from "@/lib/i18n/dictionary";
import { ToolArt } from "@/components/art/tool-art";
import { SourceNote } from "@/components/data/meta";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { getCropOptions } from "@/lib/queries/tools";
import { pageMetadata } from "@/lib/seo/metadata";
import { PriceHistoryTool } from "./tool";

export const revalidate = 21600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDict();
  return pageMetadata({
    title: t.seo.priceHistoryTitle,
    description: t.seo.priceHistoryDescription,
    path: "/tools/price-history",
  });
}

type Props = { searchParams: Promise<{ crop?: string; state?: string; market?: string }> };

export default async function PriceHistoryPage({ searchParams }: Props) {
  const t = await getDict();
  const [params, crops] = await Promise.all([searchParams, getCropOptions()]);
  return (
    <main className="container-mp space-y-6 py-6">
      <Breadcrumbs
        crumbs={[
          { name: t.chrome.home, path: "/" },
          { name: t.tools.indexTitle, path: "/tools" },
          { name: t.tools.priceHistory.title, path: "/tools/price-history" },
        ]}
      />
      <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <h1>{t.tools.priceHistory.title}</h1>
          <p className="prose-mp">{t.tools.priceHistory.intro}</p>
        </div>
        <ToolArt name="price-history" className="hidden w-52 self-center sm:block" />
      </div>
      <PriceHistoryTool
        crops={crops}
        initial={params}
        labels={t.priceHistory}
        chartLabels={t.chart}
        seasonalityLabels={{
          ...t.chart,
          emptyTitle: t.panel.seasonalityEmpty,
          emptyBody: t.panel.seasonalityNone,
        }}
        locale={await getLocale()}
      />
      <SourceNote datasets={["mandiVariety", "mandiDaily"]} />
    </main>
  );
}
