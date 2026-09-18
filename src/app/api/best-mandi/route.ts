import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/cache/ratelimit";
import {
  distances,
  geocode,
  haversineKm,
  MapsNotConfiguredError,
  MapsRequestError,
  type LatLng,
} from "@/lib/maps/ola";
import { getBestMandiCandidates, markGeocodeFailed, saveMarketCoordinates } from "@/lib/queries/tools";
import { clientIp } from "@/lib/request";
import { rankMandis } from "@/lib/tools/best-mandi";

/** Ranks markets by estimated take-home price after transport (SPEC §8.4). */

const input = z.object({
  crop: z.string().regex(/^[a-z0-9-]{1,90}$/),
  place: z.string().trim().min(3).max(120).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  quantity: z.coerce.number().positive().max(100_000).default(20),
  rate: z.coerce.number().min(0).max(1000).default(3),
  maxDistance: z.coerce.number().positive().max(2000).default(150),
});

/** Markets to price by road; the rest are shortlisted out by straight-line distance first. */
const MAX_ROAD_LOOKUPS = 25;
const MAX_GEOCODES_PER_REQUEST = 8;

export async function POST(request: NextRequest) {
  const limit = await rateLimit("best-mandi", clientIp(request), [
    { limit: 10, windowSeconds: 60 },
    { limit: 120, windowSeconds: 86_400 },
  ]);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many searches. Try again in a minute." }, { status: 429 });
  }

  const parsed = input.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ error: "Check the form values and try again." }, { status: 400 });
  const { crop, place, quantity, rate, maxDistance } = parsed.data;

  let origin: LatLng | null =
    parsed.data.lat !== undefined && parsed.data.lng !== undefined
      ? { lat: parsed.data.lat, lng: parsed.data.lng }
      : null;
  let originLabel: string | null = origin ? "your location" : null;

  try {
    if (!origin && place) {
      const found = await geocode(place);
      if (!found) {
        return NextResponse.json(
          { error: `We could not find “${place}”. Try a pincode or a larger nearby town.` },
          { status: 404 },
        );
      }
      origin = { lat: found.lat, lng: found.lng };
      originLabel = found.formattedAddress ?? place;
    }

    const candidates = await getBestMandiCandidates(crop, 7);
    if (candidates.length === 0) {
      return NextResponse.json({
        results: [],
        originLabel,
        note: "No market reported this crop in the last 7 days.",
      });
    }

    if (!origin) {
      // No location: rank by price alone, and say so.
      return NextResponse.json({
        results: rankMandis(candidates.slice(0, 20), {
          quantityQuintals: quantity,
          transportRatePerKmPerQuintal: rate,
          maxDistanceKm: maxDistance,
        }),
        originLabel: null,
        distancesAvailable: false,
        note: "Enter a place or allow location to include transport costs.",
      });
    }

    // Geocode a few missing markets, then shortlist by straight-line distance.
    const missing = candidates
      .filter((c) => c.lat === null && c.lng === null)
      .slice(0, MAX_GEOCODES_PER_REQUEST);
    for (const market of missing) {
      try {
        const found = await geocode(`${market.marketName}, ${market.district}, ${market.stateName}`);
        if (found) {
          await saveMarketCoordinates(market.marketId, found.lat, found.lng, found.confidence);
          market.lat = found.lat;
          market.lng = found.lng;
        } else {
          await markGeocodeFailed(market.marketId);
        }
      } catch (error) {
        if (error instanceof MapsNotConfiguredError) break;
      }
    }

    const from: LatLng = origin;
    const located = candidates.filter((c) => c.lat !== null && c.lng !== null);
    const shortlist = located
      .map((c) => ({ candidate: c, straightKm: haversineKm(from, { lat: c.lat!, lng: c.lng! }) }))
      .filter((c) => c.straightKm <= maxDistance)
      .sort((a, b) => b.candidate.modalPrice - a.candidate.modalPrice)
      .slice(0, MAX_ROAD_LOOKUPS);

    let roadDistances: ({ km: number; minutes: number | null } | null)[] = shortlist.map(() => null);
    let distancesAvailable = true;
    try {
      roadDistances = await distances(
        from,
        shortlist.map((s) => ({ lat: s.candidate.lat!, lng: s.candidate.lng! })),
      );
    } catch (error) {
      if (error instanceof MapsNotConfiguredError || error instanceof MapsRequestError)
        distancesAvailable = false;
      else throw error;
    }

    const results = rankMandis(
      shortlist.map((s, i) => ({
        ...s.candidate,
        // Fall back to straight-line distance if the road distance is unavailable, and label it.
        distanceKm: roadDistances[i]?.km ?? s.straightKm,
        travelMinutes: roadDistances[i]?.minutes ?? null,
        straightLineOnly: roadDistances[i] === null,
      })),
      { quantityQuintals: quantity, transportRatePerKmPerQuintal: rate, maxDistanceKm: maxDistance },
    );

    return NextResponse.json({
      results: results.slice(0, 15),
      originLabel,
      distancesAvailable,
      marketsConsidered: located.length,
      note: distancesAvailable
        ? null
        : "Road distances are unavailable, so these are straight-line distances.",
    });
  } catch (error) {
    if (error instanceof MapsNotConfiguredError) {
      return NextResponse.json(
        { error: "Distance lookups are not configured on this site yet." },
        { status: 503 },
      );
    }
    if (error instanceof MapsRequestError) {
      return NextResponse.json(
        { error: "The map service did not respond. Try again shortly." },
        { status: 502 },
      );
    }
    throw error;
  }
}
