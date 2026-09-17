# Decisions

Every non-trivial decision, with the reason. Newest last. "Verified" means checked against the live API or official docs on the date given.

## D-001 · pnpm, Node 24, Next.js 16.3.5 (2026-09-17)

- **Decision:** pnpm 9.15, Node 24 (`.nvmrc`), Next.js 16.3.5 (App Router, TypeScript strict), Tailwind 4.3, Vitest 5, Playwright 1.63, Zod 4.6.
- **Reason:** Latest stable at project start (checked on npm). Human approved pnpm.

## D-002 · Design references (2026-09-17)

- **Decision:** Phase 3 UI draws on `~/Desktop/handyads` (shadcn/Radix components, Tailwind v4 tokens, Recharts) and fonts plus UI patterns from `~/Desktop/horrorlog` (package name "nightlore": Space Grotesk + Inter via `next/font`, consent/ads/analytics components).
- **Reason:** Human request.
- **Open conflicts with SPEC §13, to settle in Phase 3:**
  - horrorlog is dark-only, but the audience reads outdoors in bright light.
  - horrorlog uses all-caps eyebrow labels, which the spec says to avoid.
  - Neither project has a Devanagari font.

## D-003 · Scaffold kept minimal in Phase 1 (2026-09-17)

- **Decision:** The placeholder home page has no fonts or design tokens.
- **Reason:** `DESIGN.md` comes first in Phase 3. Adding styling now would pre-empt it.

## D-004 · Env: validate format always, require presence per feature (2026-09-17)

- **Decision:** `src/env.ts` declares every SPEC §4 variable and validates formats: UUIDs, URLs, `G-…`, `ca-pub-…`, flags, and minimum lengths for secrets. Presence is enforced by `requireEnv(key)` where a feature needs the value. Blank values count as unset.
- **Reason:** Most services arrive in later phases. Failing at startup on missing Phase 5 keys would block Phase 1–4 work, but a malformed value still fails fast.

## D-005 · data.gov.in API behaviour (verified 2026-09-17)

Found by probing resource `9ef84268-d588-465a-a308-a864a43d0070` (current daily mandi prices). These drive the client design.

| Behaviour                                                              | Evidence                                                                                                                                  | Handling                                                                    |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Elasticsearch result window: `offset + limit ≤ 10,000`                 | `offset=20000` → HTTP 200, `status:"error"`, "Result window is too large"                                                                 | Client refuses before calling. Mandi pulls are partitioned (D-007).         |
| **Result order is not stable between requests**                        | Paging Keralam (1,041 rows) at 1,000/page gave 37 duplicate rows and silently skipped 37. First full pull lost 287 of 16,747 rows (1.7%). | Never page mandi data. One request per partition (D-007).                   |
| Plain filters are full-text and relevance-ranked                       | `filters[state]=Uttar Pradesh` → 3,248 rows (other "Pradesh" states); `filters[state.keyword]=…` → 1,271                                  | Always filter on `<field>.keyword`.                                         |
| Field names and values are case-sensitive                              | `filters[State]` → 0; `…=punjab` → 0                                                                                                      | Keep raw values from data.                                                  |
| Raw values contain stray whitespace (`"APMC Mumbai "`)                 | Seen in records                                                                                                                           | Filter with raw values; trim only when normalizing for storage.             |
| Some filters are silently ignored                                      | `filters[arrival_date]=16/09/2026` returns 17/09 rows. The resource holds only the current day.                                           | `verifyFilter` samples rows and reports `ignored` / `inexact` / `no-match`. |
| `limit` above 100 is accepted                                          | `limit=10000` → 10,000 rows, 3.8 MB, 2.9 s                                                                                                | See D-007.                                                                  |
| Gateway rate limit ≈ 60 requests/min (Tyk), no Retry-After             | 61st rapid request → 429; recovered after ~90 s                                                                                           | Throttle: 1 request per 1.1 s. 429 retries wait 60 s / 120 s / 300 s.       |
| Errors come as HTTP 200 with `status:"error"`; bad key → 403           | "Meta not found", "Key not authorised"                                                                                                    | Mapped to typed, non-retryable errors.                                      |
| This resource returns numeric prices; others return strings (`"1580"`) | Variety-wise resource sample                                                                                                              | `parsePrice` accepts both.                                                  |
| Field-name case differs across datasets                                | Daily: `arrival_date`; variety-wise: `Arrival_Date`; CSV: `Min_x0020_Price`                                                               | `normalizeFieldName`.                                                       |
| CSV served for `format=csv` with `text/csv`                            | Verified                                                                                                                                  | Client parses by Content-Type (and by body sniffing).                       |

## D-006 · Custom TLS curves for data.gov.in only (verified 2026-09-17)

- **Decision:** The data.gov.in client uses an undici `Agent` that offers classical ECDHE curves (`X25519:P-256:P-384`). Certificate verification is unchanged, and nothing global is altered.
- **Reason:** Node 24 (OpenSSL 3.5) sends a post-quantum hybrid key share by default. data.gov.in's edge stalls about half of those handshakes: `fetch` hit `UND_ERR_CONNECT_TIMEOUT` on 7 of 8 tries, while curl succeeded 8 of 8. With classical curves, 8 of 8 succeeded. The spec forbids disabling TLS, and this doesn't. Revisit when the host fixes its edge.

## D-007 · Mandi pulls: partition until each fits one request; no paging (2026-09-17)

- **Decision:**
  - Split by `state.keyword`, then `district.keyword`, then `market.keyword` until each partition has ≤ 10,000 rows.
  - Fetch each partition with a single `limit=10000` request, and check the count against the reported total.
  - States come from a seed list plus names learned from data. Names beyond the scan window are found by scanning `grade`/`commodity` slices.
  - Any rows left uncovered are reported as gaps, never dropped silently.
- **Reason:** Unstable ordering (D-005) makes paging lose data. One request per partition also means fewer requests under the rate limit: 72 requests for a full day, versus 170+ at `limit=100`.
- **Deviation from SPEC §6.1:** the spec says `limit=100` with a 300 ms page delay. That is unsafe here: paging loses rows, and 300 ms trips the 60/min limit. Politeness now comes from the 1.1 s throttle.
- Retries: 1 s, 4 s, 15 s backoff, read as up to 3 retries after the first attempt (4 attempts total). TLS errors: logged, retried once, then fail.

## D-008 · Reject rules for price rows (2026-09-17)

- **Decision:** Reject rows where:
  - a required text field is blank;
  - the date is not a valid DD/MM/YYYY date;
  - a price is ≤ 0 or non-numeric;
  - min price > max price, or modal price is outside the min–max range.
- **Reason:** These rows can't be shown honestly. The real rate is 8 of 16,747 (0.05%). Examples: Patti APMC prices of 0.02–0.04, and a modal price of 2,500 with min 3,000 and max 3,500. If Phase 2 sees higher rates, revisit before loosening.

## D-009 · Category suggestions: exact overrides + whole-word keywords (2026-09-17)

- **Decision:** `data/category-rules.json` holds an `exact` name map, then ordered keyword rules matched as whole words.
- **Reason:** Word-start matching put "Cowpea" under livestock (via "cow") and "Turnip" under pulses (via "tur"). Whole-word matching fixes both.
- **Result:** Places 263 of 267 real names. `BOP`, `Raibel`, `buttery` and `gulli` are unknown and left for human or AI review. Every suggestion stays `category_confirmed=false`.

## D-010 · Local e2e may use installed Chrome (2026-09-17)

- **Decision:** Setting `PLAYWRIGHT_CHANNEL=chrome` runs e2e against the system Chrome. CI uses Playwright's bundled Chromium.
- **Reason:** `cdn.playwright.dev` timed out from the development network, even with a 10-minute timeout.

## D-011 · Schema deviations from SPEC §6.2 (2026-09-17)

- **`prices_daily` uses the measured compact layout (P-1 resolved: optimized).** No surrogate id or timestamps. `grade_id` and `source` are smallints. The natural key is `(market, commodity, date, variety, grade)` with NULLS NOT DISTINCT, which also serves market lookups.
- **`source` is not part of the natural key.** The two mandi resources describe the same observations (D-013), so including `source` would double-count them.
- **Added `prices_market_daily`:** one median price per market, commodity and day. State and national medians, market pages, tiers and best-mandi all read it instead of variety/grade rows.
- **Added `prices_national_daily`** for the crop hub header and trend. It is computed from market prices, not from a median of state medians.
- **Weekly and monthly rollups are per market and commodity, not per variety.** Variety-level history stays in `prices_daily` for 400 days.
- **Other additions:**
  - `msp` has `variety` and `resource_id` columns.
  - `crop_mapping` has `status` and `confidence`.
  - New tables: `telegram_links`, `contact_messages`, `tier_changes`, `grades`.
  - `pg_trgm` indexes for fuzzy name search.

## D-012 · One Postgres driver: node-postgres (2026-09-17)

- **Decision:** Use `pg` with `drizzle-orm/node-postgres` for local Postgres, CI and Neon. In production this means Neon's pooled connection string.
- **Reason:** Identical code and transactions everywhere. Vercel functions run on Node, where `pg` works with Neon's pooler. The serverless driver only matters for Edge, which we don't use. This is a deviation from SPEC §3 ("Neon serverless driver").

## D-013 · Variety-wise resource is the final source; daily snapshot is provisional (2026-09-17, P-2 resolved)

- **Resource:** `35985678-0d79-46b4-9ed6-6f13308a1d24` ("Variety-wise Daily Market Prices Data of Commodity", DMI). It has 81.9 million rows back to 2009, updates nightly for the previous day, and uses the same Agmarknet names as the daily resource.
- **Rule:**
  - Daily snapshot rows are stored as `source=1`.
  - When the variety-wise data for a date and state has fully loaded, its `source=2` rows overwrite them, and any provisional rows left over for that date and state are deleted.
  - Provisional rows never overwrite final ones.
- **Filter quirks on this resource (verified):**
  - `Arrival_Date` is an exact date filter. Lowercase `arrival_date` silently turns into a loose full-text match over 5.37 million rows.
  - `state.keyword`, `district.keyword` and `commodity.keyword` are exact. `State.keyword` returns 0.
  - The job checks the date filter before looping and refuses to ingest if it isn't exact.
- **Backfill:** a local 90-day backfill is running. Production backfill depth depends on the Neon plan (see PROGRESS.md).

## D-014 · Cache: Upstash in production, local Redis in development (2026-09-17)

- **Decision:** `src/lib/cache/store.ts` exposes one small interface with an Upstash REST adapter (used when `UPSTASH_*` is set), a node-redis adapter (used when `REDIS_URL` is set), and an in-process no-op fallback. The fallback keeps counters, so rate limits and the token cap still work.
- **Rate limiting:** implemented with fixed-window counters (`INCRBY` + `EXPIRE NX`) on this interface, instead of `@upstash/ratelimit`, which only supports Upstash. This is a deviation from SPEC §3.

## D-015 · MSP sources and year convention (verified 2026-09-17)

- **Sources:** No single current MSP API exists.
  - `82e89d31…` covers kharif, rabi and other crops from 2013-14 to 2024-25 (Rajya Sabha data, published 2025-03-05).
  - `b45f166a…` covers rabi marketing seasons 2014-15 to 2025-26.
- **Year convention:** stored years are marketing seasons. Kharif crop year X is KMS X. Rabi crop year X is RMS X+1: wheat crop year 2024-25 and RMS 2025-26 are both ₹2,425, and the two tables have zero conflicts after this conversion.
- **Mapping:** `data/msp-commodities.json` links one variety per crop to a mandi commodity (e.g. Paddy Common → `Paddy(Common)`). Sugarcane (FRP) and de-husked coconut aren't linked.
- **Data lag:** kharif 2025-26 MSPs aren't in any data.gov.in API yet, and pages will say so.

## D-016 · Export sources (verified 2026-09-17)

- **Resources:** Department of Commerce "Principal Commodity wise Export", one resource per financial year: 2014-15 to 2019-20, 2021-22 and 2022-23. No 2020-21 resource is published, and 2023-24 onward isn't on data.gov.in yet.
- **Content:** each row is commodity × country × unit × quantity × US$ million, so one resource serves both the "principal" and "country-wise" needs, and `DATAGOVIN_RESOURCE_EXPORT_COUNTRYWISE` is optional.
- **Fetching:** no exact filters exist and plain filters are full-text. Each agricultural commodity (list in `data/export-commodities.json`) is fetched in one request and matched exactly on a normalized key, because names vary by year ("RICE -BASMOTI" / "RICE BASMOTI").
- **Granularity:** export groups are broad, so many crops can only map to a group such as "Fresh vegetables". The mapping review page says so, and crop pages will too.

## D-017 · Rollups run in GitHub Actions; Vercel cron recalculates tiers (2026-09-17)

- **Decision:** Rollups and retention run in the ingest workflow after each pull (SPEC §6.7 allows this). The Vercel cron route `/api/cron/rollups` recalculates tiers on Mondays and rebuilds the last 8 days of rollups, which is cheap.

## Pending decisions for the human

- P-1 and P-2 resolved with the recommended options (D-011, D-013) after the human asked to proceed through all phases.
- **P-3 · Production backfill depth.** It depends on staying on Neon Free (about 140 days of optimized data) or moving to Launch.
