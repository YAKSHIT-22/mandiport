import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/dictionary";
import { ToolArt } from "@/components/art/tool-art";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { pageMetadata } from "@/lib/seo/metadata";
import { UnitConverter } from "./converter";

export const metadata: Metadata = pageMetadata({
  title: "Unit converter: quintal, kg, tonne and USD",
  description:
    "Convert mandi prices between ₹ per quintal, ₹ per kg and ₹ per tonne, and to US dollars using a rate you enter.",
  path: "/tools/unit-converter",
});

export default async function UnitConverterPage() {
  const t = await getDict();
  return (
    <main className="container-mp space-y-6 py-6">
      <Breadcrumbs
        crumbs={[
          { name: t.chrome.home, path: "/" },
          { name: t.tools.indexTitle, path: "/tools" },
          { name: t.tools.units.title, path: "/tools/unit-converter" },
        ]}
      />
      <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <h1>{t.tools.units.title}</h1>
          <p className="prose-mp">{t.tools.units.intro}</p>
        </div>
        <ToolArt name="unit-converter" className="hidden w-52 self-center sm:block" />
      </div>
      <UnitConverter labels={t.converter} />
    </main>
  );
}
