import type { Metadata } from "next";
import { getEnv } from "@/env";
import { getDict, getLocale } from "@/lib/i18n/dictionary";
import { ToolArt } from "@/components/art/tool-art";
import { SourceNote } from "@/components/data/meta";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { getCropOptions } from "@/lib/queries/tools";
import { pageMetadata } from "@/lib/seo/metadata";
import { BestMandiTool } from "./tool";

export const revalidate = 21600;

export const metadata: Metadata = pageMetadata({
  title: "Best mandi to sell: compare after transport",
  description:
    "Rank mandis near you by what you would take home for your crop after transport costs, using the latest reported prices.",
  path: "/tools/best-mandi",
});

type Props = { searchParams: Promise<{ crop?: string }> };

export default async function BestMandiPage({ searchParams }: Props) {
  const t = await getDict();
  const [{ crop }, crops] = await Promise.all([searchParams, getCropOptions()]);
  const mapsConfigured = Boolean(getEnv().OLA_MAPS_API_KEY);

  return (
    <main className="container-mp space-y-6 py-6">
      <Breadcrumbs
        crumbs={[
          { name: t.chrome.home, path: "/" },
          { name: t.tools.indexTitle, path: "/tools" },
          { name: t.tools.bestMandi.title, path: "/tools/best-mandi" },
        ]}
      />
      <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <h1>{t.tools.bestMandi.title}</h1>
          <p className="prose-mp">{t.tools.bestMandi.intro}</p>
        </div>
        <ToolArt name="best-mandi" className="hidden w-52 self-center sm:block" />
      </div>
      <BestMandiTool
        crops={crops}
        initialCrop={crop}
        mapsConfigured={mapsConfigured}
        labels={t.bestMandi}
        locale={await getLocale()}
      />
      <SourceNote datasets={["mandiVariety", "mandiDaily"]} />
    </main>
  );
}
