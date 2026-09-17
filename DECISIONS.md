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

## Pending decisions for the human

- **P-1 · `prices_daily` layout.** Keep SPEC §6.2 as written (270 bytes/row), or use the optimized layout measured in `PROGRESS.md` (121 bytes/row)? See PROGRESS.md → Storage.
- **P-2 · Variety-wise resource.** Adopt `35985678-0d79-46b4-9ed6-6f13308a1d24` as `DATAGOVIN_RESOURCE_MANDI_VARIETY`, and decide how much history to backfill.
