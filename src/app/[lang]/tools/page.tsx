import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Compass, IndianRupee, MessageSquare, Ruler, Ship } from "lucide-react";
import { ToolArt, type ToolArtName } from "@/components/art/tool-art";
import { SourceNote } from "@/components/data/meta";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Tools for mandi sellers and exporters",
  description:
    "Compare mandis after transport, read price history and seasonality, check MSP, find export destinations and convert units.",
  path: "/tools",
});

const TOOLS = [
  {
    href: "/tools/best-mandi",
    art: "best-mandi" as ToolArtName,
    label: "Best mandi to sell",
    text: "Rank nearby markets by what you would take home after transport.",
    icon: Compass,
  },
  {
    href: "/tools/price-history",
    art: "price-history" as ToolArtName,
    label: "Price history and best month",
    text: "Daily trends, monthly averages and past seasonal peaks.",
    icon: BarChart3,
  },
  {
    href: "/tools/msp-check",
    art: "msp-check" as ToolArtName,
    label: "MSP check",
    text: "How state mandi prices compare with the minimum support price.",
    icon: IndianRupee,
  },
  {
    href: "/tools/export-destinations",
    art: "export-destinations" as ToolArtName,
    label: "Export destinations",
    text: "Which countries buy, and which markets are growing.",
    icon: Ship,
  },
  {
    href: "/tools/unit-converter",
    art: "unit-converter" as ToolArtName,
    label: "Unit converter",
    text: "₹ per quintal, kg and tonne, plus rupees to dollars.",
    icon: Ruler,
  },
  {
    href: "/ask",
    art: "ask" as ToolArtName,
    label: "Ask Mandiport",
    text: "Ask a question and get an answer from official data only.",
    icon: MessageSquare,
  },
];

export default function ToolsPage() {
  return (
    <main className="container-mp space-y-6 py-6">
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Tools", path: "/tools" },
        ]}
      />
      <h1>Tools</h1>
      <p className="prose-mp">
        Each tool works for every commodity in the data, shows the date of every figure, and says plainly when
        data is missing.
      </p>
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
