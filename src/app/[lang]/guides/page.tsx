import type { Metadata } from "next";
import Link from "next/link";
import { getDict, getLocale } from "@/lib/i18n/dictionary";
import { CROP_GUIDES_HI } from "@/content/crop-guides-hi";
import { GENERAL_GUIDES_HI } from "@/content/guides-hi";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { GUIDES } from "@/content/guides";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Guides to mandi prices, MSP and exports",
  description:
    "Plain-language guides: how to read mandi prices, compare markets before selling, understand MSP, and read India's agricultural export data.",
  path: "/guides",
});

export default async function GuidesPage() {
  const t = await getDict();
  const locale = await getLocale();
  // Hindi titles where we have them; anything untranslated keeps its English title.
  const localise = (g: (typeof GUIDES)[number]) => {
    if (locale !== "hi") return g;
    const hindi = g.crop ? CROP_GUIDES_HI[g.crop] : GENERAL_GUIDES_HI[g.slug];
    return hindi ? { ...g, title: hindi.title, description: hindi.description } : g;
  };
  const general = GUIDES.filter((g) => !g.crop).map(localise);
  const crops = GUIDES.filter((g) => g.crop).map(localise);
  return (
    <main className="w-full max-w-none space-y-8">
      <Breadcrumbs
        crumbs={[
          { name: t.chrome.home, path: "/" },
          { name: t.nav.guides, path: "/guides" },
        ]}
      />
      <h1>{t.pages.guidesTitle}</h1>
      <p className="prose-mp">{t.pages.guidesIntro}</p>
      <section aria-labelledby="basics">
        <h2 id="basics">{t.pages.guidesBasics}</h2>
        <ul className="mt-3 grid gap-4 sm:grid-cols-2">
          {general.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/guides/${g.slug}`}
                className="bg-card hover:border-primary flex h-full flex-col rounded-lg border p-4"
              >
                <span className="font-heading font-semibold">{g.title}</span>
                <span className="text-muted-foreground mt-2 text-sm">{g.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      {crops.length > 0 && (
        <section aria-labelledby="crops">
          <h2 id="crops">{t.pages.guidesCrops}</h2>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {crops.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/guides/${g.slug}`}
                  className="bg-card hover:border-primary flex h-full flex-col rounded-lg border p-4"
                >
                  <span className="font-heading font-semibold">{g.title}</span>
                  <span className="text-muted-foreground mt-2 text-sm">{g.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
