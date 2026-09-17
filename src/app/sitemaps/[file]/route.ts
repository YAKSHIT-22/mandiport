import { SITEMAP_FILES, urlsetXml, urlsFor, type SitemapFile } from "@/lib/seo/sitemap";

export const revalidate = 21600;

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const name = file.replace(/\.xml$/, "") as SitemapFile;
  if (!file.endsWith(".xml") || !SITEMAP_FILES.includes(name))
    return new Response("Not found", { status: 404 });
  const urls = await urlsFor(name);
  return new Response(urlsetXml(urls), { headers: { "content-type": "application/xml; charset=utf-8" } });
}
