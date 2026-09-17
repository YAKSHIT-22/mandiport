import { SITEMAP_FILES, sitemapIndexXml } from "@/lib/seo/sitemap";

export const revalidate = 21600;

export function GET() {
  return new Response(sitemapIndexXml(SITEMAP_FILES), {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
