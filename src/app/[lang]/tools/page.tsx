import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Compass, IndianRupee, MessageSquare, Ruler, Ship } from "lucide-react";
import { ToolArt, type ToolArtName } from "@/components/art/tool-art";
import type { Dictionary } from "@/content/i18n/en";
import { getDict } from "@/lib/i18n/dictionary";
import { SourceNote } from "@/components/data/meta";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Tools for mandi sellers and exporters",
  description:
    "Compare mandis after transport, read price history and seasonality, check MSP, find export destinations and convert units.",
  path: "/tools",
});

function toolList(t: Dictionary) {
  return [
    {
      href: "/tools/best-mandi",
      art: "best-mandi" as ToolArtName,
      label: t.footer.bestMandi,
      text: t.tools.bestMandiLong,
      icon: Compass,
    },
    {
      href: "/tools/price-history",
      art: "price-history" as ToolArtName,
      label: t.tools.priceHistoryTitle,
      text: t.tools.priceHistoryLong,
      icon: BarChart3,
    },
    {
      href: "/tools/msp-check",
      art: "msp-check" as ToolArtName,
      label: t.footer.mspCheck,
      text: t.tools.mspLong,
      icon: IndianRupee,
    },
    {
      href: "/tools/export-destinations",
      art: "export-destinations" as ToolArtName,
      label: t.footer.exportDestinations,
      text: t.tools.exportsLong,
      icon: Ship,
    },
    {
      href: "/tools/unit-converter",
      art: "unit-converter" as ToolArtName,
      label: t.footer.unitConverter,
      text: t.tools.unitsLong,
      icon: Ruler,
    },
    {
      href: "/ask",
      art: "ask" as ToolArtName,
      label: t.chrome.askCta,
      text: t.tools.askLong,
      icon: MessageSquare,
    },
  ];
}

export default async function ToolsPage() {
  const t = await getDict();
  const TOOLS = toolList(t);
  return (
    <main className="container-mp space-y-6 py-6">
      <Breadcrumbs
        crumbs={[
          { name: t.chrome.home, path: "/" },
          { name: t.tools.indexTitle, path: "/tools" },
        ]}
      />
      <h1>{t.tools.indexTitle}</h1>
      <p className="prose-mp">{t.tools.indexIntro}</p>
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
      <SourceNote datasets={["mandiVariety", "mandiDaily", "msp", "exports"]} />
    </main>
  );
}
