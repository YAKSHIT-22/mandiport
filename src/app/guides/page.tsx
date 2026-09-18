import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { GUIDES } from "@/content/guides";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Guides to mandi prices, MSP and exports",
  description:
    "Plain-language guides: how to read mandi prices, compare markets before selling, understand MSP, and read India's agricultural export data.",
  path: "/guides",
});

export default function GuidesPage() {
  const general = GUIDES.filter((g) => !g.crop);
  const crops = GUIDES.filter((g) => g.crop);
  return (
    <main className="w-full max-w-none space-y-8">
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
        ]}
      />
      <h1>Guides</h1>
      <p className="prose-mp">
        Practical explanations of how mandi prices, support prices and export data actually work, written for
        people who trade in them.
      </p>
      <section aria-labelledby="basics">
        <h2 id="basics">Understanding the data</h2>
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
          <h2 id="crops">Crop guides</h2>
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
