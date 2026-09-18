import type { Metadata } from "next";
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
      <h1>Unit converter</h1>
      <p className="prose-mp">
        Mandi prices are published in rupees per quintal (100 kg). Convert to the unit you trade in. The
        dollar rate is the one you enter: we do not publish exchange rates.
      </p>
      <UnitConverter />
    </main>
  );
}
