# MANDIPORT — Complete Build Specification for Claude Code

> **How to use this file:** Place it in the root of an empty Git repository as `SPEC.md`. Start Claude Code in that folder and send:
>
> *"Read SPEC.md completely. Then build Mandiport phase by phase exactly as specified. Before writing code for each phase, show me a short plan. After each phase, run all tests, fix failures, commit with the phase name, and tell me what you need from me (API keys, IDs, approvals) before continuing. Never skip a phase's Definition of Done."*

---

## 0. Instructions to Claude Code (read first)

1. **Work in phases (Section 14).** Do not jump ahead. Each phase ends with passing tests, a Git commit, and a short report to the human.
2. **Verify, don't assume.** Library versions, API field names, model IDs, and pricing change. Before using any external API or library, check its current official documentation. Where this spec says **VERIFY**, you must confirm with real data or docs before building on it.
3. **Stop and ask** when you need: API keys, data.gov.in resource IDs, confirmation of crop mappings, or any decision this spec leaves open. Do not invent secrets, IDs, or data.
4. **Never fabricate data.** Every number shown to users must come from the database, which comes from official sources. If data is missing, show a clear empty state.
5. **Keep costs inside free tiers** until the human says otherwise (limits in Section 3).
6. **Write tests as you go** (Section 12). A feature is not done until its tests pass.
7. Maintain `DECISIONS.md` (every non-trivial decision + reason) and `PROGRESS.md` (phase checklist status).

---

## 1. Project identity

| Item | Value |
|---|---|
| Name | **Mandiport** (mandi + port: from the market yard to the export port) |
| Tagline | Mandi prices and export demand, crop by crop |
| Suggested domain | `mandiport.in` — **human must verify availability and trademark before purchase** |
| Primary language | English (UI built i18n-ready for Hindi in Phase 2 expansion) |
| Audience | Traders, commission agents, FPOs, small agri exporters, informed farmers |
| Primary job | Show where a crop's price is heading, where to sell it in India, and who buys it abroad — using official Government of India data |

### What makes Mandiport different (build around these)
1. **Price history & seasonality** built from our own daily data collection (the source API has no history endpoint).
2. **Mandi + export data on one crop page**, linked through our own crop mapping table.
3. **Grounded AI** that explains real numbers from our database in plain language — never guesses.

---

## 2. Scope of v1

### In scope
- **All commodities** published in the Agmarknet data on data.gov.in (300+ commodities, 1,500+ varieties, 4,600+ markets), across all states where data exists, with **tiered depth** (Section 6.4).
- Category hubs (vegetables, fruits, cereals, pulses, spices, oilseeds, fibres, flowers, dry fruits, livestock & poultry, others).
- 9 tools/pages (Section 8), each working for every commodity.
- Daily mandi ingestion, periodic export ingestion.
- AI weekly briefs + "Ask Mandiport" Q&A.
- Telegram price alerts.
- Full SEO foundation (Section 9).
- Google Analytics 4 + Search Console readiness (Section 10).
- AdSense-ready ad slots, **disabled by default** (Section 10.3).

### Out of scope for v1 (do not build)
- User accounts / login (alerts use Telegram chat ID only).
- WhatsApp alerts, SMS, payments.
- Scraping any website (TradeStat, APEDA, Agmarknet HTML). **Use only official APIs.**
- Price predictions or trading advice.
- Mobile apps.

---

## 3. Tech stack and hard limits

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (latest stable, App Router, TypeScript strict) | VERIFY current version & APIs |
| Styling | Tailwind CSS (latest stable) | Design tokens from `DESIGN.md` |
| Database | Neon Postgres | Use Neon serverless driver |
| ORM | Drizzle ORM + drizzle-kit migrations | |
| Cache / rate limit | Upstash Redis (`@upstash/redis`, `@upstash/ratelimit`) | |
| AI | Vercel AI SDK + Vercel AI Gateway | Default model: DeepSeek V4.1 Flash — VERIFY exact model ID in Gateway docs |
| Indian languages (optional flag) | Sarvam AI API | VERIFY endpoints at docs.sarvam.ai |
| Maps / distance | Ola Maps API (distance matrix, geocoding) | VERIFY endpoints |
| Charts | Lightweight, accessible chart library (e.g. Recharts) | Must render server-side-safe |
| Validation | Zod | Validate every API input and every ingested record |
| Scheduled ingestion | GitHub Actions (scheduled workflow) | Long-running pulls |
| Light scheduled jobs | Vercel Cron (max 2 jobs, once/day on Hobby) | |
| Alerts | Telegram Bot API | |
| Analytics | Google Analytics 4 | Section 10 |
| Testing | Vitest (unit/integration), Playwright (e2e) | |
| Hosting | Vercel | |

### Free-tier limits to design within (as researched Sept 2026 — VERIFY before launch)

**Vercel Hobby**
- Personal, **non-commercial** use only. **Ads require Pro ($20/seat/month).** Keep `NEXT_PUBLIC_ADS_ENABLED=false` until the human upgrades.
- Cron: up to 2 jobs per project, each at most once per day, fires anywhere within the scheduled hour.
- Therefore: heavy ingestion runs in **GitHub Actions**, not Vercel functions.

**Neon Free**
- 0.5 GB storage per project, 100 CU-hours compute/month, scales to zero after 5 min idle, 5 GB transfer/month.
- **All-commodity coverage will outgrow 0.5 GB.** For reference, a public 5-year Agmarknet export is about 3.9 GB of raw data. Expect to move to **Neon Launch** (from $5/month minimum; storage about $0.35/GB-month — VERIFY) once Phase 2 measures real growth. Build so the switch needs only a new `DATABASE_URL`.
- Storage strategy (Section 6.3) is mandatory either way.

**Upstash Redis Free**
- 256 MB data, 500,000 commands/month, 10 GB bandwidth.
- Budget ≈ 16,000 commands/day. Cache wisely; never call Redis in tight loops.

**Ola Maps**
- First 100,000 monthly events free (from 1 Sept 2026), then prepaid credits. Cache all distance results.

**AI tokens**
- Enforce a **daily AI spend cap** via Redis counter (env `AI_DAILY_TOKEN_CAP`). When exceeded, AI features show a friendly "back tomorrow" state; the site keeps working.

---

## 4. Environment variables

Create `.env.example` with all of these (no real values) and validate them at startup with Zod (`src/env.ts`):

```
# Database
DATABASE_URL=

# Upstash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# data.gov.in
DATAGOVIN_API_KEY=
DATAGOVIN_RESOURCE_MANDI_DAILY=9ef84268-d588-465a-a308-a864a43d0070
DATAGOVIN_RESOURCE_MANDI_VARIETY=        # human provides from API tab
DATAGOVIN_RESOURCE_MSP=                  # human provides
DATAGOVIN_RESOURCE_EXPORT_PRINCIPAL=     # human provides
DATAGOVIN_RESOURCE_EXPORT_COUNTRYWISE=   # human provides

# AI
AI_GATEWAY_API_KEY=
AI_MODEL_ID=                             # VERIFY DeepSeek V4.1 Flash ID in Gateway
AI_DAILY_TOKEN_CAP=200000
SARVAM_API_KEY=                          # optional
FEATURE_TRANSLATION=false

# Maps
OLA_MAPS_API_KEY=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=

# Security
CRON_SECRET=
ADMIN_USERNAME=
ADMIN_PASSWORD=

# Site
NEXT_PUBLIC_SITE_URL=https://mandiport.in
NEXT_PUBLIC_GA_MEASUREMENT_ID=
NEXT_PUBLIC_GSC_VERIFICATION=
NEXT_PUBLIC_ADS_ENABLED=false
NEXT_PUBLIC_ADSENSE_CLIENT_ID=

# Scale controls
SITEMAP_WAVE=1                           # 1, 2 or 3 (Section 9.2)
DB_SIZE_WARN_MB=400
```

---

## 5. Repository structure

```
/
├─ SPEC.md, DESIGN.md, DECISIONS.md, PROGRESS.md, README.md
├─ .github/workflows/
│   ├─ ingest-mandi-daily.yml
│   ├─ ingest-exports-monthly.yml
│   └─ ci.yml                      # lint, typecheck, tests on PR/push
├─ drizzle/                        # migrations
├─ scripts/
│   ├─ discover-fields.ts          # fetch 10 records from a resource, print fields
│   ├─ ingest-mandi.ts
│   ├─ ingest-exports.ts
│   ├─ ingest-msp.ts
│   ├─ build-rollups.ts
│   ├─ calculate-tiers.ts
│   ├─ suggest-export-mappings.ts
│   ├─ generate-ai-briefs.ts
│   └─ send-alerts.ts
├─ data/
│   ├─ category-rules.json         # keyword → category (Section 6.5)
│   └─ commodity-synonyms.json     # name variants for export matching (Section 6.6)
├─ src/
│   ├─ env.ts
│   ├─ app/                        # routes (Section 8)
│   ├─ components/
│   ├─ lib/
│   │   ├─ datagovin/              # API client + normalizers
│   │   ├─ db/                     # drizzle schema + queries
│   │   ├─ cache/                  # redis helpers, keys, TTLs
│   │   ├─ ai/                     # tools, prompts, guards
│   │   ├─ maps/                   # ola maps client
│   │   ├─ seo/                    # metadata, JSON-LD builders
│   │   └─ analytics/              # GA4 event helpers
│   └─ content/                    # static copy for guides
└─ tests/
    ├─ fixtures/                   # recorded API responses
    ├─ unit/
    ├─ integration/
    └─ e2e/
```

---

## 6. Data layer

### 6.1 data.gov.in API client (`src/lib/datagovin`)

Request format:
```
GET https://api.data.gov.in/resource/{resource_id}?api-key={KEY}&format=json&offset={n}&limit=100&filters[{field}]={value}
```

Build a robust client that handles these **known quirks**:
- Field names are **inconsistent** across datasets and sometimes differ in case. Map every dataset through a per-resource normalizer.
- **Filters are case-sensitive** on field names. Test filters with `limit=1` before looping.
- Some datasets **return CSV even when JSON is requested**. Check `Content-Type` and parse accordingly.
- Pagination can return an **empty `records` array before `total` is reached**. Treat an empty page as the end.
- Some older endpoints have **SSL certificate errors**. Log them; retry once; do not silently disable TLS globally.
- Max `limit` is 100 on most datasets. Add a ~300 ms delay between pages. No published rate limit — be polite.
- Prices arrive as **strings**; dates as **DD/MM/YYYY**. Convert explicitly; reject unparseable rows into a `rejects` log.
- Markets report **sparsely** — never label data "today" unless `arrival_date` is today; always show the actual date.
- **No trading volume** in the daily price dataset.
- Retries: exponential backoff (1s, 4s, 15s), max 3 attempts per page.

**Phase 1 requirement:** run `scripts/discover-fields.ts` for every resource ID and save field lists to `tests/fixtures/fields/*.json`. Build normalizers only after seeing real fields.

### 6.2 Database schema (Drizzle)

All tables have `created_at`, `updated_at`. Use integer surrogate keys, unique natural-key constraints for idempotent upserts.

```
states            (id, name, slug UNIQUE)
districts         (id, state_id FK, name, slug, UNIQUE(state_id, slug))
markets           (id, district_id FK, name, slug, lat NULL, lng NULL,
                   UNIQUE(district_id, slug))
categories        (id, name, slug UNIQUE, sort_order INT)
commodities       (id, source_name UNIQUE, display_name, slug UNIQUE,
                   category_id FK NULL, category_confirmed BOOL DEFAULT false,
                   tier SMALLINT CHECK IN (1,2,3),        -- Section 6.4
                   markets_reporting_90d INT, days_reported_90d INT,
                   tier_updated_at TIMESTAMPTZ)
varieties         (id, commodity_id FK, source_name, display_name, slug,
                   UNIQUE(commodity_id, slug))

prices_daily      (id, arrival_date DATE, market_id FK, commodity_id FK,
                   variety_id FK NULL, grade TEXT NULL,
                   min_price INT, max_price INT, modal_price INT,   -- ₹/quintal
                   source TEXT,                                     -- 'mandi_daily' | 'mandi_variety'
                   UNIQUE(arrival_date, market_id, commodity_id, variety_id, grade, source))
  INDEX (commodity_id, arrival_date DESC)
  INDEX (market_id, commodity_id, arrival_date DESC)

prices_weekly     (week_start DATE, market_id, commodity_id, variety_id NULL,
                   avg_modal INT, min_modal INT, max_modal INT, days_reported INT,
                   UNIQUE(week_start, market_id, commodity_id, variety_id))
prices_monthly    (month DATE, market_id, commodity_id, variety_id NULL,
                   avg_modal INT, min_modal INT, max_modal INT, days_reported INT,
                   UNIQUE(month, market_id, commodity_id, variety_id))
prices_state_daily(arrival_date, state_id, commodity_id, median_modal INT,
                   markets_reporting INT, UNIQUE(arrival_date, state_id, commodity_id))

msp               (id, commodity_id FK, season TEXT, year TEXT, msp_price INT,
                   UNIQUE(commodity_id, season, year))

export_commodities(id, source_name, slug UNIQUE, unit TEXT)
countries         (id, name, slug UNIQUE, iso2 NULL)
exports_annual    (id, year TEXT, export_commodity_id FK, country_id FK NULL,
                   quantity NUMERIC NULL, unit TEXT NULL, value_usd_million NUMERIC,
                   source TEXT, UNIQUE(year, export_commodity_id, country_id, source))

crop_mapping      (id, commodity_id FK, export_commodity_id FK, hs_code TEXT,
                   notes TEXT, verified BOOL DEFAULT false)

ai_briefs         (id, commodity_id FK, week_start DATE, language TEXT DEFAULT 'en',
                   body_md TEXT, facts_json JSONB, model_id TEXT,
                   status TEXT CHECK IN ('draft','published'), UNIQUE(commodity_id, week_start, language))

alerts            (id, telegram_chat_id TEXT, commodity_id, market_id NULL, state_id NULL,
                   direction TEXT CHECK IN ('above','below'), threshold INT,
                   active BOOL, last_triggered_on DATE NULL)

ingest_runs       (id, job TEXT, started_at, finished_at, status TEXT,
                   rows_fetched INT, rows_upserted INT, rows_rejected INT, error TEXT NULL)
ingest_rejects    (id, run_id FK, raw JSONB, reason TEXT)
```

### 6.3 Storage strategy (all commodities)
- Ingest **every commodity**, but store efficiently: integer foreign keys, `INT` prices, no duplicated text columns in `prices_daily`.
- Keep `prices_daily` for **the last 400 days**; older rows are rolled into `prices_weekly`/`prices_monthly` then deleted (`scripts/build-rollups.ts`). Weekly/monthly rollups are kept indefinitely.
- Keep `ingest_rejects` for 30 days; keep `ingest_runs` for 180 days.
- Admin metric: database size (`pg_database_size`) with warnings at 400 MB (Free) and at a configurable threshold (`DB_SIZE_WARN_MB`) after upgrading.
- **Phase 1:** record real rows/day for all commodities in `PROGRESS.md`, project storage for 30/90/400 days, and tell the human when the Free plan will run out and the expected Launch plan cost.

### 6.4 All commodities with tiered depth

Every commodity gets pages and works in every tool. Depth depends on how much data exists, recalculated weekly from the last 90 days:

| Tier | Rule (defaults, configurable) | What it gets |
|---|---|---|
| **1 — Major** | ≥ 50 markets reporting and ≥ 60 reporting days in last 90 days | Full hub, indexed, weekly AI brief, featured on home/category pages, guide page (Phase 6: top 15 only) |
| **2 — Regular** | ≥ 5 markets and ≥ 20 reporting days | Full hub, indexed, AI Q&A support, no weekly brief |
| **3 — Sparse** | Below Tier 2 | Hub page with available data, **`noindex, follow`**, included in tools and search |

- Tiers update automatically every Monday (`tier_updated_at`); log changes.
- Tier thresholds live in `src/config/tiers.ts`.

### 6.5 Commodity categories
- Seed `categories` (vegetables, fruits, cereals, pulses, spices, oilseeds, fibres, flowers, dry fruits, livestock & poultry, others).
- Auto-assign categories with a rules file (`data/category-rules.json`, keyword → category) plus an optional AI suggestion for unmatched names. All auto-assignments start `category_confirmed=false`.
- Admin page lists unconfirmed categories for one-click human confirmation. Unconfirmed commodities still appear under "Others" until confirmed.

### 6.6 Export mapping (only where exports exist)
Not every mandi commodity has an export counterpart (e.g. many local vegetables). The export section appears **only when a mapping exists**.

- `scripts/suggest-export-mappings.ts`: for each commodity, generate candidate matches against export commodity names (normalized string similarity + synonyms list in `data/commodity-synonyms.json`, e.g. "Cummin Seed(Jeera)" ↔ "Cumin"). Store as `verified=false` with a confidence score.
- Admin page: review queue sorted by Tier, then confidence. Human confirms, edits, or rejects. HS codes are entered by the human (ITC-HS codes were dropped/reallocated for some commodities from April 2026, so never auto-fill HS codes as verified).
- **Launch requirement:** verified mappings for all Tier 1 commodities that have exports. Tier 2/3 mappings can be completed after launch.
- Pages show an "Unverified mapping" note while `verified=false`, and hide export sections for rejected/absent mappings.

### 6.7 Ingestion jobs

**`ingest-mandi-daily.yml` (GitHub Actions)**
- Runs twice daily (evening IST and next morning IST) to catch late-reporting markets. Upserts are idempotent.
- **All commodities:** avoid one giant offset loop. Page through the day's data **state by state** (filter by state field, VERIFY filter name), so failures are isolated and resumable. Store a checkpoint per state in `ingest_runs` so a failed run resumes where it stopped.
- New commodity, variety, market, district, or state names found in data are created automatically (slugged, `category_confirmed=false`) and listed in the admin page.
- Bulk upserts in batches (e.g. 500 rows) inside transactions; never row-by-row inserts.
- Log total runtime; alert in the admin page if a run exceeds 45 minutes so it stays well within GitHub Actions job limits.
- Steps: fetch all states → normalize → upsert dimensions → bulk upsert `prices_daily` → refresh `prices_state_daily` for affected dates → invalidate relevant Redis keys → trigger revalidation of affected pages (batch by commodity) via a secured route (`POST /api/revalidate` with `CRON_SECRET`) → run `send-alerts.ts`.
- Writes an `ingest_runs` row every time, success or failure.

**`ingest-exports-monthly.yml`**
- Monthly. Pulls both export resources, normalizes, upserts. Records the latest available year/month so pages can state data lag honestly.

**Vercel Cron (max 2, daily)**
1. `/api/cron/rollups` — rollups + retention cleanup daily; on Mondays also recalculate commodity tiers (6.4). If rollups are too heavy for a Vercel function's time limit, move them into the GitHub Actions ingest workflow and keep this cron for tier recalculation only.
2. `/api/cron/ai-briefs` — generate weekly briefs for **Tier 1 commodities only**, on Mondays (handler checks weekday), processing in small batches with resume support.

All cron/API job routes require `Authorization: Bearer ${CRON_SECRET}`.

---

## 7. Caching (Upstash Redis)

Central key builder in `src/lib/cache/keys.ts`. Every key has a TTL.

| Key pattern | Content | TTL |
|---|---|---|
| `mp:v1:hub:{crop}` | crop hub summary JSON | 6 h (+ invalidate after ingest) |
| `mp:v1:trend:{crop}:{market}:{days}` | trend series | 6 h |
| `mp:v1:best:{crop}:{originHash}` | best-mandi results | 3 h |
| `mp:v1:dist:{from}:{to}` | Ola Maps distance | 30 days |
| `mp:v1:exp:{crop}` | export summary | 7 days |
| `mp:v1:ask:{hash(question)}` | AI answer | 24 h |
| `mp:v1:ai:tokens:{YYYYMMDD}` | daily token counter | 48 h |
| rate limit keys | via `@upstash/ratelimit` | sliding window |

Rules: pages use static generation/ISR first; Redis only for interactive tools and AI. Never `KEYS *`. Batch with pipelines where possible.

---

## 8. Pages and tools

Mobile-first. Every tool: one clear input area, one clear result, plain language, visible data date + source, empty and error states that tell the user what to do next.

### 8.1 Routes

| Route | Purpose | Rendering |
|---|---|---|
| `/` | What Mandiport does; commodity search; category shortcuts; biggest price movers today (Tier 1–2 only, min markets threshold); latest weekly briefs | ISR |
| `/crops` | All commodities A–Z with category filter, tier-aware ordering, and instant search | ISR |
| `/categories/[category]` | Category hub: commodities in category, top movers, links | ISR |
| `/api/search` | Typeahead search across commodities, varieties, markets, states (Hindi/English names ready) | Dynamic, cached |
| `/crops/[crop]` | **Crop hub** (8.2) | ISR |
| `/crops/[crop]/[state]` | State view: markets reporting, state median trend | ISR |
| `/crops/[crop]/[state]/[market]` | Market view: price history + seasonality | ISR |
| `/tools/price-history` | Price history & best-month-to-sell tool | Dynamic client + cached API |
| `/tools/best-mandi` | Best mandi to sell | Dynamic |
| `/tools/export-destinations` | Export destination finder | ISR + client filters |
| `/tools/msp-check` | MSP vs mandi | ISR |
| `/tools/unit-converter` | ₹/quintal ↔ ₹/kg ↔ ₹/tonne; ₹ ↔ USD (user-entered rate) | Static |
| `/ask` | Ask Mandiport (AI Q&A) | Dynamic |
| `/briefs` and `/briefs/[crop]/[week]` | Weekly AI market briefs | ISR |
| `/alerts` | Create Telegram alerts | Dynamic |
| `/methodology` | Data sources, update times, known limitations, licence | Static |
| `/about`, `/contact`, `/privacy`, `/terms`, `/disclaimer` | Required trust pages | Static |
| `/admin` | Basic-auth stats: ingest runs, rejects, DB size, Redis usage estimate, AI tokens, alerts count | Dynamic, noindex |
| `/api/*` | Tool endpoints, revalidate, cron, telegram webhook | — |

### 8.2 Crop hub `/crops/[crop]` — acceptance criteria
- Header: crop name, latest national median modal price (₹/quintal), date of data, change vs 7 and 30 days.
- **Mandi trend chart**: 90-day national median (from `prices_state_daily`), toggle 30/90/365 when data exists.
- **Top 10 markets** by latest modal price with dates (link to market pages).
- **Export section (only if a mapping exists, 6.6)**: latest year export value (USD million) and quantity; 5-year trend if available; top 10 destination countries; data lag note; "Unverified mapping" note if applicable. Commodities without exports show nothing here (no empty export box).
- **Weekly brief** (Tier 1 only; latest published) with "AI-assisted summary of official data" label. Tier 2/3 hubs show an "Ask Mandiport about {commodity}" prompt instead.
- **Varieties** list with latest price per variety when variety data exists.
- Tier 3 hubs render a short "Limited data: {n} markets reported in the last 90 days" note.
- **MSP** line on chart if MSP exists for the crop.
- Short, data-driven explanatory copy (Section 9.4).
- Source attribution block (Section 11).

### 8.3 Price history & best month to sell
- Inputs: crop, state, market (searchable select), period.
- Outputs: line chart (modal with min–max band), table of monthly averages, "historically highest average months" **only when ≥ 12 months of data exist**; otherwise show "Seasonality appears after 12 months of data. Data collection started on {date}."
- Copy must never promise future prices.

### 8.4 Best mandi to sell
- Inputs: crop, user location (pincode/place via Ola geocoding, or browser geolocation with permission), quantity (quintals), transport cost (₹ per km per quintal, user-editable default), max distance (km).
- Logic: candidate markets reporting the crop within the last 7 days → distance via Ola Maps (cached) → `net = modal_price × qty − distance × cost × qty` → sort by net.
- Output: ranked list with market, date of price, distance, estimated net, and a clear note that prices may have changed and transport cost is an estimate.
- Markets without coordinates: geocode once (market + district + state), store lat/lng, mark low-confidence geocodes.

### 8.5 Export destination finder
- Inputs: crop.
- Outputs: countries ranked by latest value; year-over-year growth; fastest-growing (min value threshold to avoid noise); map-free table + bar chart.

### 8.6 MSP check
- Crop + state → latest state median modal vs MSP; show % above/below; dates of both.

### 8.7 Ask Mandiport (grounded AI)
- **The model never writes SQL and never answers from general knowledge.** It may only call these tools (AI SDK tool calling), each backed by fixed, parameterized, read-only queries:
  - `list_crops()`
  - `get_latest_prices(crop, state?, market?)`
  - `get_price_trend(crop, state?, market?, days)` (days ∈ 7..365)
  - `compare_markets(crop, state, limit)`
  - `get_msp(crop)`
  - `get_export_summary(crop, years)`
  - `get_top_destinations(crop, year?)`
- System prompt rules: answer only from tool results; cite data dates; if data is missing say so; no predictions, no buy/sell advice; keep answers short; use ₹/quintal.
- Output renders the answer + a "Data used" disclosure listing tool calls and dates.
- Guards: Zod-validate tool args; resolve crop/market names with fuzzy matching against DB; rate limit 5 questions/min and 30/day per IP; cache by normalized question; enforce `AI_DAILY_TOKEN_CAP`.
- Out-of-scope questions get a polite refusal pointing to supported questions (show 4 example questions).

### 8.8 Weekly AI briefs
- Generated Mondays for **each Tier 1 commodity** (typically the most-traded few dozen; this keeps AI cost and human review time manageable) from a **facts JSON** computed in code (week change, month change, top movers, export latest year, MSP gap). The model receives only the facts JSON.
- Stored as `draft`. **Admin page lets the human review and publish.** Only `published` briefs appear publicly and in the sitemap.
- Each brief: 150–300 words, headline, 3 key numbers, data dates, label "AI-assisted summary of official data, reviewed by Mandiport."
- If `FEATURE_TRANSLATION=true`, also produce Hindi via Sarvam, stored with `language='hi'` (not publicly routed until i18n phase).

### 8.9 Telegram alerts
- `/alerts` page explains how to start the bot, then a form: crop, state or market, above/below, threshold.
- Bot flow: user sends `/start` → bot replies with a one-time code → user enters code on site to link chat ID (store only chat ID).
- `send-alerts.ts` runs after ingest: trigger at most once per alert per day; message includes price, market, date, and unsubscribe instruction (`/stop`).
- Webhook route validates `TELEGRAM_WEBHOOK_SECRET`.

---

## 9. SEO requirements

### 9.1 Technical
- Next.js Metadata API on every route: unique `title` (≤ 60 chars), `description` (≤ 155 chars), canonical URL, Open Graph + Twitter tags.
- Dynamic OG images for crop hubs and briefs (crop name, latest price, date).
- `sitemap.xml` generated from DB; split into sitemap index + child sitemaps (static, crops, states, markets, briefs). Include `lastModified` from real data dates.
- `robots.txt`: allow all public pages; disallow `/admin`, `/api`.
- Clean, lowercase, hyphenated slugs. 301 redirect trailing-slash variants consistently.
- Breadcrumbs on all nested pages.
- Structured data (JSON-LD), validated in tests:
  - `Organization` + `WebSite` (site-wide)
  - `BreadcrumbList` (nested pages)
  - `Dataset` on crop hub and market pages (name, description, temporalCoverage, spatialCoverage, license link, creator = source agency, isBasedOn = data.gov.in resource URL)
  - `Article` on published briefs (datePublished, dateModified, author = Mandiport)
- Semantic HTML: one `h1` per page, logical heading order, descriptive link text.
- Performance targets (mobile Lighthouse): Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO = 100. LCP < 2.5s, CLS < 0.1, INP < 200ms. Avoid large client bundles; charts load lazily below the fold.
- Images: `next/image`, explicit sizes. Fonts: self-hosted via `next/font`, subset, `display: swap`.

### 9.2 Indexing rules (avoid "low value / thin content")
With 300+ commodities × thousands of markets, page count can reach tens of thousands. Most combinations have sparse data, and mass-producing thin pages risks both Google ranking and AdSense approval. Enforce:
- Commodity hubs: indexable for **Tier 1 and Tier 2 only**; Tier 3 = `noindex, follow`.
- Commodity × state pages: indexable only with ≥ 3 reporting markets and ≥ 20 reporting days in the last 90 days.
- Commodity × market pages: indexable only with ≥ 30 reporting days in the last 180 days.
- Draft briefs never indexed.
- Sitemaps list **only indexable URLs**, and are regenerated after tier recalculation.
- **Launch in waves:** at launch, sitemaps include Tier 1 hubs, their state pages, guides, and category hubs. Add Tier 2 hubs 4 weeks after launch and qualifying market pages 8 weeks after launch (controlled by `SITEMAP_WAVE` env: 1, 2, or 3). Pages still render and link normally in all waves.
- No page may consist only of a table; each indexable page needs data-driven explanatory copy (9.4).

### 9.3 Internal linking
- Crop hub ↔ its state pages ↔ market pages ↔ relevant tools (pre-filled links, e.g. `/tools/best-mandi?crop=onion`).
- Every brief links to its crop hub; every crop hub links to latest brief and export finder.
- "Related crops" block on hubs.

### 9.4 Data-driven copy (no filler)
Generate 2–4 short paragraphs per indexable page **in code from real numbers** using varied, well-written sentence templates (at least 6 variants per paragraph type, chosen deterministically by slug hash so text is stable). Example facts to express: latest modal price and date; change vs last week/month; number of markets reporting; highest and lowest market; position vs MSP; export trend direction and top destination. Never claim anything not in the data.

### 9.5 Content pages (write real, useful guides)
Under `/guides` (static MDX), each 700–1,200 words, original, practical:
1. What is modal price and how to read mandi prices
2. How to compare mandis before selling (transport, quality, timing)
3. Understanding MSP and when it applies
4. How Indian agri export data works (annual vs monthly, lag, HS codes)
5. One guide for each of the **top 15 Tier 1 commodities** (by markets reporting): major markets, seasons, varieties, export basics. More guides are added after launch based on Search Console data.
6. One short overview per category hub (150–300 words, original)

---

## 10. Analytics, Search Console, and ads

### 10.1 Google Analytics 4
- Load GA4 only when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set, using the official Next.js third-parties integration or `next/script` (VERIFY recommended method in current Next.js docs).
- Cookie/analytics notice with Accept/Decline; do not load GA until accepted; remember choice.
- Typed event helper `track(event, params)` in `src/lib/analytics`. Implement these events:

| Event | Params |
|---|---|
| `crop_hub_view` | crop |
| `tool_used` | tool, crop, state? |
| `best_mandi_result` | crop, results_count, max_distance_km |
| `ask_question` | answered (bool), tools_called_count |
| `ask_refused` | reason |
| `alert_created` | crop, direction |
| `brief_view` | crop, week |
| `chart_period_change` | crop, days |
| `source_link_click` | dataset |

- No personal data in event params.

### 10.2 Search Console
- Support verification via `NEXT_PUBLIC_GSC_VERIFICATION` meta tag.
- README section: add property, verify, submit `sitemap.xml`, check indexing weekly.

### 10.3 AdSense readiness (disabled)
- `<AdSlot position="..."/>` component renders nothing unless `NEXT_PUBLIC_ADS_ENABLED=true`.
- Reserve layout space only when enabled (avoid CLS).
- Positions: below crop hub header, mid-page on guides, end of briefs. Never inside tools' input/result areas.
- `ads.txt` route generated from `NEXT_PUBLIC_ADSENSE_CLIENT_ID` when set.
- README: **upgrade Vercel to Pro before enabling ads** (Hobby is non-commercial).

### 10.4 Weekly usage review (for the human)
Add `docs/WEEKLY_REVIEW.md` checklist:
- GA4: users, sessions, top pages, events count per tool, returning users.
- Search Console: impressions, clicks, top queries, pages indexed vs excluded.
- Admin page: ingest success rate, rejects, DB size, AI tokens used, alerts active.
- Decision questions: Which tool is used most? Which crop pages get impressions? What should be doubled down on or removed?

---

## 11. Legal, trust, and attribution
- Every page with data shows: **"Source: {agency} via Open Government Data Platform India (data.gov.in). Licensed under Government Open Data License – India (GODL-India)."** with link to the dataset and the licence.
- `/disclaimer`: data provided as published by government sources; may be delayed, incomplete, or revised; not financial or trading advice; verify before transactions.
- `/privacy`: what's collected (analytics with consent, Telegram chat IDs for alerts only), retention, contact, deletion (`/stop` + contact form). Mention compliance intent with India's DPDP Act in plain language (human to review with a professional).
- AI labels wherever AI text appears.
- Contact form with spam protection (honeypot + rate limit); store messages in DB or forward via email service only if human provides one (ask).

---

## 12. Testing and quality gates

- **Unit:** normalizers (every quirk in 6.1 has a test), date/price parsing, net-price calculation, seasonality logic, slug generation, copy templates (never output undefined/NaN), JSON-LD builders.
- **Integration:** ingestion against recorded fixtures (idempotency: running twice produces no duplicates), rollups, AI tool functions against a seeded test DB, cache invalidation.
- **AI guard tests:** off-topic question → refusal; missing data → "no data" answer; tool args validation rejects bad input; token cap blocks calls.
- **E2E (Playwright):** home → crop hub → market page; best-mandi tool happy path (mock Ola Maps); ask page with mocked model; alerts form; 404 page; noindex on thin market page.
- **CI (`ci.yml`):** lint, typecheck, unit + integration tests on every push. E2E on main.
- **Accessibility:** automated axe checks in e2e for key pages.
- No `any` without a comment explaining why. No unhandled promise rejections.

---

## 13. Design direction

Before building UI (Phase 3), write `DESIGN.md` with a compact token system: 4–6 named hex colours, typefaces and roles, type scale, spacing, layout concept with ASCII wireframes for home, crop hub, and best-mandi tool, and 3 principles. Then review it against the brief and revise anything that looks like a generic default.

Brief for the design:
- **Subject world:** Indian mandi yards, commodity sacks, auction chalkboards, trade ledgers, export shipping documents. Draw distinctive choices from this world rather than generic SaaS styling.
- **Audience reality:** mostly mobile, often outdoors in bright light, variable literacy with English. High contrast, large tap targets (≥ 44px), numbers must be the most legible element on the page.
- **Personality:** trustworthy, practical, data-first, calm. Spend boldness in one place (e.g., how prices and change are displayed); keep everything else quiet.
- **Avoid:** identical rounded card grids with soft shadows everywhere, gradient washes as decoration, all-caps eyebrow labels above every heading, accenting one word in headlines, decorative motion on scroll.
- **Type:** choose a family with excellent numerals (tabular figures for prices) and a Devanagari companion that works for future Hindi pages.
- **Charts:** clear axes, ₹ formatting (Indian digit grouping, e.g. ₹1,25,000), date labels in DD MMM YYYY, colour-blind-safe series, text summary for screen readers.
- Respect `prefers-reduced-motion`; visible keyboard focus; responsive down to 320px.

Copy rules: sentence case, plain verbs, name things by what users understand ("Best mandi to sell," not "Arbitrage engine"). Buttons say exactly what happens ("Find best mandi"). Errors explain what happened and what to do.

---

## 14. Phased build plan (maps to Weeks 1–10)

Each phase: short plan → build → tests pass → commit `phase-N: <name>` → update `PROGRESS.md` → report + requests to human.

### Phase 1 — Foundations & data discovery (Week 1)
- Next.js app, TypeScript strict, Tailwind, ESLint/Prettier, Vitest, Playwright, CI workflow.
- `src/env.ts` validation; `.env.example`.
- data.gov.in client with quirk handling (6.1).
- `scripts/discover-fields.ts`; run for all provided resource IDs; save field fixtures.
- Pull one full day of mandi data for **all states and commodities**. Save the full list of commodity, variety, and state names to `tests/fixtures/names/`.
- Build `data/category-rules.json` and `data/commodity-synonyms.json` from the real names.
- Record real rows/day for all commodities, measure one full-day pull's runtime, and project storage (6.3). **Report to the human: expected days until Neon Free is full and estimated Launch plan cost.**
**Done when:** client tests pass for every quirk; fixtures saved; storage/runtime report delivered.

### Phase 2 — Database, ingestion, tiers & mappings (Weeks 2–3)
- Drizzle schema + migrations (6.2); seed categories and states.
- `ingest-mandi.ts` (state-by-state, resumable, bulk upserts), `ingest-msp.ts`, `ingest-exports.ts` with Zod validation, rejects log, `ingest_runs`.
- `build-rollups.ts` + retention (6.3); tier calculation (6.4); auto-categorization (6.5).
- `suggest-export-mappings.ts` (6.6) and a minimal admin review screen (basic auth) for categories and mappings.
- GitHub Actions workflows (secrets documented in README).
- Backfill: pull whatever recent history the API returns for all commodities, within storage limits.
- **Ask the human** to confirm categories for Tier 1 commodities and review export mappings for Tier 1 commodities (with HS codes).
**Done when:** running ingestion twice yields no duplicates; a failed state resumes correctly; rollups correct against fixture math; tiers computed; workflows succeed on GitHub with real data; Tier 1 mappings reviewed by the human.

### Phase 3 — Design system & core pages (Weeks 3–5)
- `DESIGN.md` → tokens in Tailwind config; base components (price display, change indicator, chart wrapper, data source block, empty/error states, breadcrumbs).
- Routes: `/`, `/crops`, `/categories/[category]`, `/crops/[crop]`, `/crops/[crop]/[state]`, `/crops/[crop]/[state]/[market]`, `/api/search`, trust pages, `/methodology`.
- Pre-render only Tier 1 hubs at build time; render everything else on demand with ISR (build must not try to pre-render tens of thousands of pages).
- Redis caching + revalidation route.
- SEO foundation (9.1–9.4) for these routes, including tier-based noindex and sitemap waves.
**Done when:** e2e navigation passes for a Tier 1, Tier 2, and Tier 3 commodity; build time stays under 10 minutes; Lighthouse targets met on a Tier 1 hub (mobile); JSON-LD validates; Tier 3 and thin pages are noindex; sitemap contains only wave-eligible indexable URLs.

### Phase 4 — Tools (Weeks 5–7)
- `/tools/price-history`, `/tools/best-mandi` (Ola Maps + geocode storage), `/tools/export-destinations`, `/tools/msp-check`, `/tools/unit-converter`.
- Rate limiting on tool APIs.
**Done when:** each tool has unit + e2e tests; empty/error states verified; results show dates and sources.

### Phase 5 — AI features (Weeks 7–8)
- AI SDK + Gateway setup; tool functions (8.7); `/ask` with guards, caching, token cap.
- Weekly brief generation (facts JSON → draft) + admin review/publish UI; `/briefs` routes.
- Optional Sarvam translation behind flag.
**Done when:** AI guard tests pass; no answer contains numbers absent from tool results (add a test comparing numbers in answer vs tool outputs); briefs publish flow works.

### Phase 6 — Alerts, analytics, guides (Weeks 8–9)
- Telegram bot webhook, linking flow, alerts page, `send-alerts.ts` in ingest workflow.
- GA4 with consent + all events (10.1); GSC verification; `AdSlot` + `ads.txt` (disabled).
- `/guides` content (9.5); sitemap index including guides and published briefs.
**Done when:** alert end-to-end test (mocked Telegram) passes; events fire in GA4 DebugView (human verifies); sitemap lists only indexable URLs.

### Phase 7 — Hardening & launch (Week 10)
- Security review: auth on admin/cron/webhooks, input validation, headers (CSP, HSTS, X-Content-Type-Options, Referrer-Policy), dependency audit.
- Performance pass; bundle analysis; image/font checks.
- Error monitoring via Vercel logs + structured logging; admin page metrics.
- Full README: local setup, env vars, Neon/Upstash/Vercel/GitHub secrets setup, domain, GA4, Search Console, weekly review, enabling ads later (Pro upgrade first).
- `docs/LAUNCH_CHECKLIST.md` and `docs/WEEKLY_REVIEW.md`.
**Done when:** all CI green; Lighthouse targets met on home, crop hub, best-mandi, brief; human completes launch checklist on production.

---

## 15. Post-launch (not built now — record in `docs/ROADMAP.md`)
- Hindi (then other languages) with `hreflang`.
- Complete export mappings for Tier 2/3 commodities.
- More guides for commodities that gain Search Console impressions.
- IMD rainfall and CWC reservoir data for the same crops' regions.
- Monthly export data if an official API becomes available.
- Paid alert tiers for traders (only after usage proves demand).

---

## 16. Final reminders to Claude Code
- Official APIs only. Attribute every data display.
- Real data only; honest dates; clear lag notes.
- AI answers only from tool results; drafts reviewed before publishing.
- Stay within free tiers; ads stay disabled until the human upgrades hosting.
- Ask the human whenever a VERIFY item or secret is needed.
