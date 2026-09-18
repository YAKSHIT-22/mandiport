import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Compass, IndianRupee, MessageSquare, Ruler, Ship } from "lucide-react";
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
    label: "Best mandi to sell",
    text: "Rank nearby markets by what you would take home after transport.",
    icon: Compass,
  },
  {
    href: "/tools/price-history",
    label: "Price history and best month",
    text: "Daily trends, monthly averages and past seasonal peaks.",
    icon: BarChart3,
  },
  {
    href: "/tools/msp-check",
    label: "MSP check",
    text: "How state mandi prices compare with the minimum support price.",
    icon: IndianRupee,
  },
  {
    href: "/tools/export-destinations",
    label: "Export destinations",
    text: "Which countries buy, and which markets are growing.",
    icon: Ship,
  },
  {
    href: "/tools/unit-converter",
    label: "Unit converter",
    text: "₹ per quintal, kg and tonne, plus rupees to dollars.",
    icon: Ruler,
  },
  {
    href: "/ask",
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
              className="bg-card hover:border-primary flex h-full gap-3 rounded-lg border p-4 transition-colors"
            >
              <t.icon className="text-primary mt-1 size-5 shrink-0" aria-hidden="true" />
              <span>
                <span className="font-heading block font-semibold">{t.label}</span>
                <span className="text-muted-foreground block text-sm">{t.text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <SourceNote datasets={["mandiVariety", "mandiDaily", "msp", "exports"]} />
    </main>
  );
}
