import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { cached } from "@/lib/cache/store";
import { keys, TTL } from "@/lib/cache/keys";
import { rateLimit } from "@/lib/cache/ratelimit";
import { clientIp } from "@/lib/request";
import { searchSite } from "@/lib/queries/site";

const query = z.string().trim().min(2).max(60);

export async function GET(request: NextRequest) {
  const parsed = query.safeParse(request.nextUrl.searchParams.get("q") ?? "");
  if (!parsed.success) return NextResponse.json({ results: [] });

  const limit = await rateLimit("search", clientIp(request), [{ limit: 60, windowSeconds: 60 }]);
  if (!limit.ok)
    return NextResponse.json({ error: "Too many searches. Wait a moment and try again." }, { status: 429 });

  const q = parsed.data.toLowerCase();
  const results = await cached(keys.search(q), TTL.search, () => searchSite(q));
  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
