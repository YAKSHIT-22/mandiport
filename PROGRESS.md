# Progress

## Phase checklist

| Phase                                     | Status                                                  |
| ----------------------------------------- | ------------------------------------------------------- |
| 1 — Foundations & data discovery          | ✅ Done 2026-09-17, waiting on human for Phase 2 inputs |
| 2 — Database, ingestion, tiers & mappings | ⏳ Not started                                          |
| 3 — Design system & core pages            | ⏳                                                      |
| 4 — Tools                                 | ⏳                                                      |
| 5 — AI features                           | ⏳                                                      |
| 6 — Alerts, analytics, guides             | ⏳                                                      |
| 7 — Hardening & launch                    | ⏳                                                      |

## Phase 1: Definition of Done

- [x] Next.js 16.3.5 app, strict TypeScript, Tailwind 4, ESLint, Prettier, Vitest, Playwright, CI workflow (`.github/workflows/ci.yml`)
- [x] `src/env.ts` Zod validation + `.env.example`
- [x] data.gov.in client with a test for every SPEC §6.1 quirk, plus quirks found live (DECISIONS D-005 to D-007)
- [x] `scripts/discover-fields.ts` run for every configured resource → `tests/fixtures/fields/mandi-daily.json`. The other four resource IDs aren't provided yet.
- [x] Full-day pull, all states and commodities → `tests/fixtures/names/` (states, commodities, varieties, grades, markets)
- [x] `data/category-rules.json` and `data/commodity-synonyms.json` built from real names
- [x] Rows/day, runtime and storage projections (below)
- Tests: 86 unit tests pass; 1 e2e smoke test passes; lint, typecheck and format are clean.

## Data volume (measured 2026-09-17)

**Current daily snapshot** (`9ef84268…`, full pull at 18:49 IST):

| Metric                                          | Value                                                                       |
| ----------------------------------------------- | --------------------------------------------------------------------------- |
| Rows reported by API                            | 16,747 (16,142 an hour earlier; late markets keep arriving)                 |
| Rows fetched / accepted / rejected / duplicates | 16,747 / 16,739 / 8 / 0                                                     |
| States / districts / markets                    | 29 / 492 / 1,764                                                            |
| Commodities / varieties / grades                | 267 / 799 / 15                                                              |
| Arrival dates in snapshot                       | only 2026-09-17 (no history in this resource)                               |
| Runtime                                         | 78 s (47 s partition planning + 32 s fetching)                              |
| Requests / bytes downloaded                     | 72 / 6.6 MB                                                                 |
| Partitions                                      | 29 (one per state; the largest, Tamil Nadu at 6,716 rows, fits one request) |

**Final daily volume**, from the variety-wise resource, which keeps history: 16 Sep 2026 = **18,364** rows, 15 Sep 2026 = **20,394** rows. The projections below use **20,000 rows/day**. Seasonal peaks may be higher, so re-measure in Phase 2 across a month of backfill.

## Storage (measured on PostgreSQL 18, real rows × 30 days)

One real day was loaded into the SPEC §6.2 schema and replicated to 30 days (502,170 rows), then measured.

| Table layout                                                                                                                                                                                                          | Heap  | Indexes | **Bytes/row**                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------- | ----------------------------------------------------- |
| SPEC §6.2 as written: `id`, timestamps, `grade TEXT`, `source TEXT`, unique key + 2 indexes                                                                                                                           | 47 MB | 82 MB   | **270**                                               |
| Optimized: no surrogate id or timestamps on the fact table, `grade_id`/`source` as `smallint`, unique key ordered `(market, commodity, date, …)` so it also serves market lookups, plus the `(commodity, date)` index | 29 MB | 29 MB   | **121** (projected at ~145 to allow for upsert bloat) |

The query plan for market + commodity + date range uses the index in the optimized layout.

Other growth:

- `prices_state_daily`: about 2,800 rows/day at 50 bytes, 0.14 MB/day.
- Weekly and monthly rollups: about 0.4 MB/day.
- Base database plus dimension tables: about 9 MB.

**Projected database size at 20k rows/day:**

| Days of `prices_daily` | SPEC layout                             | Optimized layout |
| ---------------------- | --------------------------------------- | ---------------- |
| 30                     | ~185 MB                                 | ~110 MB          |
| 90                     | ~540 MB (over Free)                     | ~320 MB          |
| 400 (retention cap)    | ~2.4 GB                                 | ~1.4 GB          |
| After 400 days         | +~0.2 GB/year (rollups + state medians) | same             |

**When Neon Free (0.5 GB) runs out, from the first ingestion day:**

- SPEC layout: 400 MB warning at about **day 66**, full at about **day 85**.
- Optimized layout: warning at about **day 114**, full at about **day 147**.
- Backfilling history from the variety-wise resource moves these dates earlier, one for one. For example, a 90-day backfill with the SPEC layout fills Free immediately.

**Neon Launch cost** (verified on neon.com/pricing 2026-09-17: **no monthly minimum**, $0.35/GB-month storage, $0.106/CU-hour compute; SPEC §3 said a $5 minimum, which is out of date):

- Storage at the 400-day steady state: about $0.84/month (SPEC layout) or $0.49/month (optimized).
- Compute: ingestion is about 10 min/day, so under 2 CU-hours/month. Site traffic and ISR revalidation keeping the database awake are the real variable. At 0.25 CU awake 2–8 h/day, that's 15–60 CU-hours, or $1.60–$6.40/month.
- **Estimated total: about $2–8/month**, driven by compute rather than storage.
- VERIFY in Phase 2: whether Launch charges separately for restore-window (history) storage.

## Rate-limit budget

The gateway allows about 60 requests/min.

- A full daily pull is about 72 requests, twice daily about 150 requests/day.
- Backfill with the variety-wise resource needs about 1 request per state-day partition (days with more than 10,000 rows split further). 400 days × ~30 states is about 12,000 requests, or about 3.7 hours at 55/min. That should be spread over several GitHub Actions runs.
