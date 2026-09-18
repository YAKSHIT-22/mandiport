# Progress

## Phase checklist

| Phase                                     | Status                                                                       |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| 1 — Foundations & data discovery          | ✅ Done 2026-09-17                                                           |
| 2 — Database, ingestion, tiers & mappings | ✅ Done 2026-09-17 (human review of categories and mappings still open)      |
| 3 — Design system & core pages            | ✅ Done 2026-09-17                                                           |
| 4 — Tools                                 | ✅ Done 2026-09-18                                                           |
| 5 — AI features                           | ✅ Done 2026-09-18 (needs `AI_GATEWAY_API_KEY` to run live)                  |
| 6 — Alerts, analytics, guides             | ✅ Done 2026-09-18 (needs Telegram and GA4 keys to run live)                 |
| 7 — Hardening & launch                    | ✅ Code complete; launch steps in `docs/LAUNCH_CHECKLIST.md` need production |

## What is running locally

Local Postgres 18 and Redis, with 90 days of real data loaded from data.gov.in.

| Measure                  | Value                                                         |
| ------------------------ | ------------------------------------------------------------- |
| Daily price rows         | 1,762,109                                                     |
| Days of national medians | 90                                                            |
| Commodities / markets    | 321 / 3,645                                                   |
| Tiers                    | 119 major, 101 regular, 101 sparse                            |
| MSP rows                 | 337 (kharif, rabi and other crops, by marketing season)       |
| Export rows              | 28,149 across 7 usable years (2015-16 to 2022-23, no 2020-21) |
| Database size            | 485 MB                                                        |

## Definition of done, by phase

**Phase 1.** Client tests cover every SPEC §6.1 quirk plus the ones found live; field and name fixtures saved; storage and runtime report delivered.

**Phase 2.** Running ingestion twice produces no duplicates; a failed state resumes; rollups match fixture maths; tiers computed; admin review screens exist. GitHub Actions workflows are written and skip cleanly without secrets, but have not yet run against a production database.

**Phase 3.** Navigation works for Tier 1, 2 and 3 crops; build stays well under 10 minutes; Lighthouse targets met (below); JSON-LD validates in tests; Tier 3 and thin pages are `noindex, follow`; sitemaps contain only wave-eligible URLs.

**Phase 4.** Each tool has unit and e2e tests, empty and error states, and shows dates and sources.

**Phase 5.** AI guard tests pass, including a test that rejects any answer containing numbers absent from tool results; briefs publish through the admin flow.

**Phase 6.** Alerts pass an end-to-end test with Telegram mocked; GA4 loads only after consent; sitemaps list only indexable URLs. GA4 DebugView still needs a human with a real property.

**Phase 7.** Security headers verified on a running build, admin and cron routes return 401 without credentials, `pnpm audit --prod` is clean, and the launch and weekly-review documents are written.

## Tests

- 178 unit and integration tests (Vitest), integration running against a real Postgres database, inserting only `prices_daily` so they exercise the same derivation as production
- 20 end-to-end tests (Playwright), including axe accessibility checks on key pages in both themes
- CI runs lint, format check, typecheck and all tests on every push, with a Postgres service; e2e runs on `main`

## Lighthouse (local production build, mobile preset)

| Page                      | Performance | Accessibility | Best practices | SEO | LCP   | CLS   |
| ------------------------- | ----------- | ------------- | -------------- | --- | ----- | ----- |
| Home                      | 94          | 100           | 100            | 100 | 2.9 s | 0.038 |
| Crop hub (onion)          | 92          | 100           | 100            | 100 | 3.3 s | 0     |
| Best mandi tool           | 92          | 100           | 100            | 100 | 3.3 s | 0     |
| Crop hub (desktop preset) | 98          | 100           | 100            | 100 | —     | —     |

Performance, accessibility, best practices and SEO meet the SPEC §9.1 targets. **LCP does not**: the target is under 2.5 s and the local measurement is 2.9–3.3 s under Lighthouse's simulated slow 4G, against a local server with no CDN and no HTTP/2. Re-measure on the deployed site before launch; the launch checklist has this as a blocking item.

Improvements already made: the Devanagari font is no longer loaded (no Hindi route exists yet), the heading font is not preloaded so the first paint uses its fallback, and the 27 KB default favicon was replaced by a 1 KB SVG mark.

## Data volume and storage (measured)

Rows per day settle at about **19,500** once late reports arrive (the same-day snapshot showed 16,747 at 18:49 IST; the final variety-wise data for 15 Sep held 20,394).

Measured on 91 days of real data, after `prices_market_daily` became a view (DECISIONS D-024):

| Table                   | Rows   | Size       | Notes                                   |
| ----------------------- | ------ | ---------- | --------------------------------------- |
| `prices_daily`          | 1.78 M | 183 MB     | About 108 bytes a row including indexes |
| `prices_weekly`         | 396 k  | 42 MB      | Kept indefinitely                       |
| `prices_monthly`        | 134 k  | 15 MB      | Kept indefinitely                       |
| `prices_state_daily`    | 130 k  | 11 MB      |                                         |
| `prices_national_daily` | 22 k   | 1.8 MB     |                                         |
| `exports_annual`        | 28 k   | 5.5 MB     | 7 years                                 |
| **Database total**      |        | **269 MB** | for 91 days, rollups included           |

That is about **2.7 MB a day**: roughly 2.15 MB of daily prices and state and national medians, plus 0.6 MB of rollups.

| Days retained       | Projected size                                      |
| ------------------- | --------------------------------------------------- |
| 91                  | 0.27 GB (measured)                                  |
| 180                 | ~0.5 GB                                             |
| 400 (retention cap) | ~1.1 GB                                             |
| After 400 days      | +~0.2 GB a year (rollups and medians keep accruing) |

**Neon Free (0.5 GB) now lasts about 180 days** of all-India data, against 90 days before the change. The full 400-day window in SPEC §6.3 needs Neon Launch. At Launch pricing (verified 2026-09-17: no monthly minimum, $0.35/GB-month storage, $0.106/CU-hour compute) storage at the 400-day steady state costs about **$0.39/month**, with compute the larger variable: roughly **$2–8/month in total**.

Before the change the same 91 days cost 485 MB without rollups, because `prices_market_daily` duplicated `prices_daily` almost row for row at a higher cost per row.

## Rate-limit budget

The data.gov.in gateway allows about 60 requests a minute (measured: the 61st rapid request returned 429, clearing after about 90 seconds).

- A full daily pull is about 72 requests and 80 seconds.
- A day of final variety-wise data is about 30 requests and 60–70 seconds.
- Export ingestion is about 360 requests, once a month.
- The 90-day backfill took roughly 100 minutes of wall time at 1 request per 1.1 seconds.

## Still needed from the human

1. **Neon, Upstash and Vercel accounts**, and the GitHub secrets listed in the README.
2. **Confirm crop categories** and **review export mappings** in `/admin` (bulk actions provided).
3. **Keys** for the AI gateway, Ola Maps, Telegram and GA4, to turn those features on.
4. **Production Lighthouse run** to confirm LCP, and the rest of `docs/LAUNCH_CHECKLIST.md`.
5. A decision on **retention versus plan**: 400 days on Neon Launch (~1.1 GB), or a shorter window (180 days stays inside Neon Free).
