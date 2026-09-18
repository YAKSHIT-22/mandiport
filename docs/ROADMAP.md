# Roadmap (after launch)

Recorded from SPEC §15, plus measurements made while building. Nothing here is built yet.

## Language

- **Hindi pages** with `hreflang`, then other languages. The schema already carries `commodities.name_hi` and briefs carry a `language` column; `FEATURE_TRANSLATION` produces Hindi brief drafts through Sarvam. The Devanagari webfont is deliberately not loaded until a Hindi route exists, to keep English pages light.

## Data

- **Complete export mappings** for Tier 2 and Tier 3 crops, working down the review queue by tier and confidence.
- **Monthly export data**, if an official API appears. Only annual figures are published as open data today, and the latest year is 2022-23.
- **IMD rainfall and CWC reservoir data** for the same growing regions, to give crop pages weather context.
- **Market coordinates**: run `pnpm geocode:markets` in batches so the best-mandi tool covers more markets; today it geocodes on demand.

## Storage and cost

Measured on 88 days of all-India data (see PROGRESS.md):

- `prices_daily` costs about 126 bytes a row, as designed.
- `prices_market_daily` costs about 163 bytes a row for almost the same number of rows, because a market usually reports one variety and grade per day. It is a derived table, so it could be removed and its queries answered from `prices_daily` with a group-by, roughly halving storage growth. That is the single biggest saving available, and worth doing before the 400-day retention window fills.

## Product

- **More guides** for crops that gain Search Console impressions, rather than guessing.
- **Paid alert tiers** for traders, only after usage shows demand.
- **Arrivals data**, if a quantity series ever becomes available: the current price feed has no volumes.

## Engineering

- Replace the fixed-window rate limiter with a sliding window if abuse appears.
- Add a CSP nonce if Next.js gains a way to do it without forcing every page to render dynamically.
- Consider a read replica if crop-hub queries ever become the bottleneck; today they are single-digit milliseconds.
