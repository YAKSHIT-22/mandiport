import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { cached } from "@/lib/cache/store";
import { keys, TTL } from "@/lib/cache/keys";
import { rateLimit } from "@/lib/cache/ratelimit";
import { clientIp } from "@/lib/request";
import { searchSite } from "@/lib/queries/site";
import { LOCALE_COOKIE, toLocale } from "@/lib/i18n/config";
import { dictionaryFor } from "@/lib/i18n/dictionary";
import { categoryName, cropName } from "@/lib/i18n/names";

const query = z.string().trim().min(2).max(60);

export async function GET(request: NextRequest) {
  const parsed = query.safeParse(request.nextUrl.searchParams.get("q") ?? "");
  if (!parsed.success) return NextResponse.json({ results: [] });

  const limit = await rateLimit("search", clientIp(request), [{ limit: 60, windowSeconds: 60 }]);
  if (!limit.ok)
    return NextResponse.json({ error: "Too many searches. Wait a moment and try again." }, { status: 429 });

  const q = parsed.data.toLowerCase();
  const results = await cached(keys.search(q), TTL.search, () => searchSite(q));

  // Results are cached once in English and translated per request, so both languages share one
  // cache entry. Market, district and state names are proper nouns and stay as published.
  const locale = toLocale(request.cookies.get(LOCALE_COOKIE)?.value);
  const t = dictionaryFor(locale);
  const localised = results.map((r) =>
    r.type === "crop"
      ? {
          ...r,
          label: cropName(r.slug, r.label, locale),
          detail: r.detailSlug ? categoryName(r.detailSlug, r.detail, locale) : t.common.commodity,
        }
      : r.type === "state"
        ? { ...r, detail: t.common.state }
        : r,
  );

  return NextResponse.json(
    { results: localised },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
