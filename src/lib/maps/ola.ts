import { z } from "zod";
import { getEnv } from "@/env";
import { keys, TTL } from "@/lib/cache/keys";
import { getCache } from "@/lib/cache/store";

/**
 * Ola Maps client (SPEC §8.4). Endpoints and parameter shapes taken from Ola's own client
 * library (github.com/lavvsharma/py_olamaps):
 *   GET https://api.olamaps.io/places/v1/geocode?address=…&api_key=…
 *   GET https://api.olamaps.io/routing/v1/distanceMatrix?origins=lat,lng&destinations=lat,lng|…&api_key=…
 * Every result is cached (30 days) because the free allowance is 100,000 events a month.
 * VERIFY against a live key before launch: no key was available while building this.
 */

const BASE = "https://api.olamaps.io";

export class MapsNotConfiguredError extends Error {
  override name = "MapsNotConfiguredError";
  constructor() {
    super("Ola Maps is not configured (OLA_MAPS_API_KEY is not set).");
  }
}

export class MapsRequestError extends Error {
  override name = "MapsRequestError";
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeocodeResult extends LatLng {
  formattedAddress: string | null;
  /** "high" when Ola returned a single confident match, "low" otherwise. */
  confidence: "high" | "low";
}

const latLng = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

const geocodeResponse = z.object({
  geocodingResults: z
    .array(
      z.object({
        formatted_address: z.string().optional(),
        geometry: z.object({ location: latLng }),
      }),
    )
    .optional(),
  // Some responses use `results` instead.
  results: z
    .array(z.object({ formatted_address: z.string().optional(), geometry: z.object({ location: latLng }) }))
    .optional(),
});

const distanceMatrixResponse = z.object({
  rows: z.array(
    z.object({
      elements: z.array(
        z.object({
          distance: z.number().nullable().optional(),
          duration: z.number().nullable().optional(),
          status: z.string().optional(),
        }),
      ),
    }),
  ),
  status: z.string().optional(),
});

async function request(path: string, params: Record<string, string>): Promise<unknown> {
  const apiKey = getEnv().OLA_MAPS_API_KEY;
  if (!apiKey) throw new MapsNotConfiguredError();
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url, {
    headers: { accept: "application/json", "X-Request-Id": crypto.randomUUID() },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new MapsRequestError(`Ola Maps HTTP ${response.status}`);
  return response.json();
}

/** Geocodes a pincode, town or market name in India. Cached for 30 days. */
export async function geocode(query: string): Promise<GeocodeResult | null> {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (normalized.length < 3) return null;
  const cache = await getCache();
  const key = keys.geocode(normalized);
  const hit = await cache.getJson<GeocodeResult | null>(key).catch(() => null);
  if (hit !== null) return hit;

  const raw = await request("/places/v1/geocode", { address: `${normalized}, India`, language: "English" });
  const parsed = geocodeResponse.safeParse(raw);
  if (!parsed.success) throw new MapsRequestError("Unexpected geocoding response from Ola Maps");
  const list = parsed.data.geocodingResults ?? parsed.data.results ?? [];
  const first = list[0];
  const result: GeocodeResult | null = first
    ? {
        lat: first.geometry.location.lat,
        lng: first.geometry.location.lng,
        formattedAddress: first.formatted_address ?? null,
        confidence: list.length === 1 ? "high" : "low",
      }
    : null;
  await cache.setJson(key, result, TTL.geocode).catch(() => {});
  return result;
}

const MAX_DESTINATIONS_PER_CALL = 25;

export interface DistanceResult {
  /** Road distance in kilometres. */
  km: number;
  /** Travel time in minutes, when Ola returns it. */
  minutes: number | null;
}

const coord = (p: LatLng) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;

/**
 * Road distances from one origin to many destinations, in the given order.
 * Cached per origin/destination pair for 30 days; only uncached pairs are requested.
 */
export async function distances(origin: LatLng, destinations: LatLng[]): Promise<(DistanceResult | null)[]> {
  const cache = await getCache();
  const results: (DistanceResult | null)[] = new Array(destinations.length).fill(null);
  const missing: number[] = [];

  await Promise.all(
    destinations.map(async (destination, index) => {
      const key = keys.distance(coord(origin), coord(destination));
      const hit = await cache.getJson<DistanceResult>(key).catch(() => null);
      if (hit) results[index] = hit;
      else missing.push(index);
    }),
  );
  if (missing.length === 0) return results;

  for (let i = 0; i < missing.length; i += MAX_DESTINATIONS_PER_CALL) {
    const batch = missing.slice(i, i + MAX_DESTINATIONS_PER_CALL);
    const raw = await request("/routing/v1/distanceMatrix", {
      origins: coord(origin),
      destinations: batch.map((index) => coord(destinations[index]!)).join("|"),
    });
    const parsed = distanceMatrixResponse.safeParse(raw);
    if (!parsed.success) throw new MapsRequestError("Unexpected distance matrix response from Ola Maps");
    const elements = parsed.data.rows[0]?.elements ?? [];
    await Promise.all(
      batch.map(async (destinationIndex, position) => {
        const element = elements[position];
        if (!element || (element.status && element.status !== "OK") || element.distance == null) return;
        const value: DistanceResult = {
          km: Math.round((element.distance / 1000) * 10) / 10,
          minutes: element.duration == null ? null : Math.round(element.duration / 60),
        };
        results[destinationIndex] = value;
        await cache
          .setJson(keys.distance(coord(origin), coord(destinations[destinationIndex]!)), value, TTL.distance)
          .catch(() => {});
      }),
    );
  }
  return results;
}

/** Great-circle distance in km: a floor for road distance, used to shortlist markets. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}
