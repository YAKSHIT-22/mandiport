/** Take-home price ranking for the best-mandi tool (SPEC §8.4). Pure maths, unit-tested. */

export type MandiCandidate = {
  marketId: number;
  marketName: string;
  district: string;
  stateName: string;
  stateSlug: string;
  marketSlug: string;
  cropSlug: string;
  modalPrice: number;
  date: string;
  lat: number | null;
  lng: number | null;
};

export type RankedMandi = MandiCandidate & {
  distanceKm: number | null;
  travelMinutes: number | null;
  grossValue: number;
  transportCost: number;
  netValue: number;
};

export interface RankInput {
  quantityQuintals: number;
  /** ₹ per km per quintal. */
  transportRatePerKmPerQuintal: number;
  maxDistanceKm: number;
}

/**
 * net = modal × quantity − distance × rate × quantity.
 * Markets with no distance (not geocoded, or Ola unavailable) keep their gross value and are
 * ranked after those with a distance, never silently treated as zero-distance.
 */
export function rankMandis(
  candidates: (MandiCandidate & { distanceKm?: number | null; travelMinutes?: number | null })[],
  input: RankInput,
): RankedMandi[] {
  const quantity = Math.max(0, input.quantityQuintals);
  const rate = Math.max(0, input.transportRatePerKmPerQuintal);

  return candidates
    .map((c) => {
      const distanceKm = c.distanceKm ?? null;
      const grossValue = Math.round(c.modalPrice * quantity);
      const transportCost = distanceKm === null ? 0 : Math.round(distanceKm * rate * quantity);
      return {
        ...c,
        distanceKm,
        travelMinutes: c.travelMinutes ?? null,
        grossValue,
        transportCost,
        netValue: grossValue - transportCost,
      };
    })
    .filter((c) => c.distanceKm === null || c.distanceKm <= input.maxDistanceKm)
    .sort((a, b) => {
      if (a.distanceKm === null && b.distanceKm !== null) return 1;
      if (b.distanceKm === null && a.distanceKm !== null) return -1;
      return b.netValue - a.netValue || (a.distanceKm ?? 0) - (b.distanceKm ?? 0);
    });
}
