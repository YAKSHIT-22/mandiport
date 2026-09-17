import { createHash } from "node:crypto";

/** Central cache key builder (SPEC §7). Every key has a TTL. Bump VERSION to invalidate everything. */
const VERSION = "v1";
const p = (...parts: (string | number)[]) => ["mp", VERSION, ...parts].join(":");

export const hash = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 24);

const HOUR = 3600;
const DAY = 24 * HOUR;

export const TTL = {
  hub: 6 * HOUR,
  trend: 6 * HOUR,
  best: 3 * HOUR,
  distance: 30 * DAY,
  exports: 7 * DAY,
  ask: DAY,
  aiTokens: 2 * DAY,
  search: 6 * HOUR,
  geocode: 30 * DAY,
} as const;

export const keys = {
  hub: (crop: string) => p("hub", crop),
  trend: (crop: string, market: string, days: number) => p("trend", crop, market, days),
  best: (crop: string, origin: string) => p("best", crop, hash(origin)),
  distance: (from: string, to: string) => p("dist", from, to),
  exports: (crop: string) => p("exp", crop),
  ask: (normalizedQuestion: string) => p("ask", hash(normalizedQuestion)),
  aiTokens: (yyyymmdd: string) => p("ai", "tokens", yyyymmdd),
  search: (query: string) => p("search", hash(query)),
  geocode: (query: string) => p("geo", hash(query)),
  /** Prefix for rate-limit counters. */
  rateLimit: (name: string, id: string, window: number) => p("rl", name, hash(id), window),
};

/** Keys to delete after an ingest touches these commodity slugs (SPEC §6.7). */
export function keysToInvalidate(cropSlugs: string[]): string[] {
  return cropSlugs.flatMap((slug) => [keys.hub(slug), keys.exports(slug)]);
}
