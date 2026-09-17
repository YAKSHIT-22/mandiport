/** Tier thresholds (SPEC §6.4). Counted over the last `windowDays` days of data. */
export const TIER_CONFIG = {
  windowDays: 90,
  tier1: { minMarkets: 50, minDays: 60 },
  tier2: { minMarkets: 5, minDays: 20 },
} as const;

export type Tier = 1 | 2 | 3;

export function tierFor(marketsReporting: number, daysReported: number, config = TIER_CONFIG): Tier {
  if (marketsReporting >= config.tier1.minMarkets && daysReported >= config.tier1.minDays) return 1;
  if (marketsReporting >= config.tier2.minMarkets && daysReported >= config.tier2.minDays) return 2;
  return 3;
}

/** Indexing thresholds for nested pages (SPEC §9.2). */
export const INDEXING = {
  state: { minMarkets: 3, minDays: 20, windowDays: 90 },
  market: { minDays: 30, windowDays: 180 },
} as const;
