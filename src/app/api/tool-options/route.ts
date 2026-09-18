import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/cache/ratelimit";
import { getMarketOptions, getStateOptions } from "@/lib/queries/tools";
import { clientIp } from "@/lib/request";

const slug = z.string().regex(/^[a-z0-9-]{1,90}$/);
const input = z.object({ crop: slug, state: slug.optional() });

/** State and market options for the tool selects. */
export async function GET(request: NextRequest) {
  const limit = await rateLimit("tool-options", clientIp(request), [{ limit: 60, windowSeconds: 60 }]);
  if (!limit.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const parsed = input.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ states: [], markets: [] });

  const [states, markets] = await Promise.all([
    getStateOptions(parsed.data.crop),
    parsed.data.state ? getMarketOptions(parsed.data.crop, parsed.data.state) : Promise.resolve([]),
  ]);
  return NextResponse.json({ states, markets }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
}
