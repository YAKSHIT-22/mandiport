import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/cache/ratelimit";
import {
  getCropBySlug,
  getFirstDataDate,
  getMarketInState,
  getMarketMonthly,
  getMarketSeries,
  getNationalSeries,
  getStateBySlug,
  getStateSeries,
} from "@/lib/queries/crop";
import { clientIp } from "@/lib/request";

const input = z.object({
  crop: z.string().regex(/^[a-z0-9-]{1,90}$/),
  state: z
    .string()
    .regex(/^[a-z0-9-]{1,90}$/)
    .optional(),
  market: z
    .string()
    .regex(/^[a-z0-9-]{1,90}$/)
    .optional(),
});

/** Series, monthly averages and first data date for the price history tool (SPEC §8.3). */
export async function GET(request: NextRequest) {
  const limit = await rateLimit("price-history", clientIp(request), [{ limit: 30, windowSeconds: 60 }]);
  if (!limit.ok) return NextResponse.json({ error: "Too many requests. Wait a moment." }, { status: 429 });

  const parsed = input.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const crop = await getCropBySlug(parsed.data.crop);
  if (!crop) return NextResponse.json({ error: "Unknown crop" }, { status: 404 });

  const state = parsed.data.state ? await getStateBySlug(parsed.data.state) : null;
  if (parsed.data.state && !state) return NextResponse.json({ error: "Unknown state" }, { status: 404 });
  const market = state && parsed.data.market ? await getMarketInState(state.id, parsed.data.market) : null;
  if (parsed.data.market && !market) return NextResponse.json({ error: "Unknown market" }, { status: 404 });

  const [series, monthly, firstDate] = await Promise.all([
    market
      ? getMarketSeries(crop.id, market.id)
      : state
        ? getStateSeries(crop.id, state.id)
        : getNationalSeries(crop.id),
    market ? getMarketMonthly(crop.id, market.id) : Promise.resolve([]),
    getFirstDataDate(crop.id, market?.id),
  ]);

  return NextResponse.json(
    {
      crop: { slug: crop.slug, name: crop.name },
      place: market ? `${market.name}, ${state!.name}` : state ? state.name : "India",
      series,
      monthly,
      firstDate,
    },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
