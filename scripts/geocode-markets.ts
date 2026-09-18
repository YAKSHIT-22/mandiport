/**
 * Fills market coordinates using Ola Maps, for the best-mandi tool (SPEC §8.4).
 * Geocodes each market once, stores lat/lng and a confidence, and records failures so they
 * are not retried endlessly. Ola's free allowance is 100,000 events a month, so runs are capped.
 *
 *   pnpm exec tsx --env-file-if-exists=.env.local scripts/geocode-markets.ts --limit=200
 */
import { sql } from "drizzle-orm";
import { geocode, MapsNotConfiguredError } from "@/lib/maps/ola";
import { markGeocodeFailed, saveMarketCoordinates } from "@/lib/queries/tools";
import { arg, logger, runScript } from "./lib/context";

runScript("geocode-markets", async ({ db }) => {
  const limit = Number(arg("limit") ?? 100);
  const rows = await db.execute<{
    id: number;
    name: string;
    district: string;
    state: string;
    markets: number;
  }>(sql`
    select m.id, m.name, d.name as district, s.name as state,
           (select count(*)::int from prices_market_daily pm where pm.market_id = m.id and pm.arrival_date > current_date - 90) as markets
    from markets m
    join districts d on d.id = m.district_id
    join states s on s.id = d.state_id
    where m.lat is null and m.geocode_confidence is distinct from 'failed'
    order by markets desc
    limit ${limit}`);

  let located = 0;
  let failed = 0;
  for (const market of rows.rows) {
    try {
      const result = await geocode(`${market.name}, ${market.district}, ${market.state}`);
      if (result) {
        await saveMarketCoordinates(market.id, result.lat, result.lng, result.confidence);
        located++;
      } else {
        await markGeocodeFailed(market.id);
        failed++;
      }
    } catch (error) {
      if (error instanceof MapsNotConfiguredError) {
        logger.warn("OLA_MAPS_API_KEY is not set; nothing to do");
        return;
      }
      logger.warn("geocoding failed", {
        market: market.name,
        error: error instanceof Error ? error.message : String(error),
      });
      failed++;
    }
  }
  logger.info("geocoding finished", { attempted: rows.rows.length, located, failed });
});
