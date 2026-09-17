import { sql } from "drizzle-orm";
import { CATEGORY_OVERVIEWS } from "@/content/categories";
import { GUIDES } from "@/content/guides";
import { getDb } from "@/lib/db";
import { hubUrls, marketUrls, stateUrls, type SitemapUrl } from "./indexing";
import { siteUrl } from "./site";

/** Sitemap index + child sitemaps (SPEC §9.1, §9.2). Only indexable, wave-eligible URLs. */

export const SITEMAP_FILES = ["static", "crops", "states", "markets", "briefs"] as const;
export type SitemapFile = (typeof SITEMAP_FILES)[number];

const STATIC_PATHS = [
  "/",
  "/crops",
  "/tools/price-history",
  "/tools/best-mandi",
  "/tools/export-destinations",
  "/tools/msp-check",
  "/tools/unit-converter",
  "/briefs",
  "/guides",
  "/methodology",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/disclaimer",
];

export async function urlsFor(file: SitemapFile): Promise<SitemapUrl[]> {
  switch (file) {
    case "static":
      return [
        ...STATIC_PATHS.map((path) => ({ path })),
        ...Object.keys(CATEGORY_OVERVIEWS).map((c) => ({ path: `/categories/${c}` })),
        ...GUIDES.map((g) => ({ path: `/guides/${g.slug}`, lastModified: g.updated })),
      ];
    case "crops":
      return hubUrls();
    case "states":
      return stateUrls();
    case "markets":
      return marketUrls();
    case "briefs": {
      const rows = await getDb().execute<{ crop: string; week: string; updated: string }>(sql`
        select c.slug as crop, b.week_start::text as week, b.updated_at::date::text as updated
        from ai_briefs b join commodities c on c.id = b.commodity_id
        where b.status = 'published' and b.language = 'en' order by b.week_start desc`);
      return [...rows.rows.map((r) => ({ path: `/briefs/${r.crop}/${r.week}`, lastModified: r.updated }))];
    }
  }
}

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function urlsetXml(urls: SitemapUrl[]): string {
  const body = urls
    .map(
      (u) =>
        `<url><loc>${escapeXml(siteUrl(u.path))}</loc>${u.lastModified ? `<lastmod>${u.lastModified}</lastmod>` : ""}</url>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

export function sitemapIndexXml(files: readonly string[]): string {
  const body = files
    .map((f) => `<sitemap><loc>${escapeXml(siteUrl(`/sitemaps/${f}.xml`))}</loc></sitemap>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`;
}
