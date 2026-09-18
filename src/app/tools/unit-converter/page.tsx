import type { Metadata } from "next";
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

export default function UnitConverterPage() {
  return (
    <main className="container-mp space-y-6 py-6">
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Tools", path: "/tools" },
          { name: "Unit converter", path: "/tools/unit-converter" },
        ]}
      />
      <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <h1>Unit converter</h1>
          <p className="prose-mp">
            Mandi prices are published in rupees per quintal (100 kg). Convert to the unit you trade in. The
            dollar rate is the one you enter: we do not publish exchange rates.
          </p>
        </div>
        <ToolArt name="unit-converter" className="hidden w-52 self-center sm:block" />
      </div>
      <UnitConverter />
    </main>
  );
}
