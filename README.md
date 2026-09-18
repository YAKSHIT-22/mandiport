# Mandiport

Mandi prices and export demand, crop by crop, built on official Government of India data from data.gov.in.

- Daily mandi prices for every commodity Agmarknet publishes, with the date each figure refers to
- Price history and seasonality we build ourselves, because the source API has no history endpoint
- Mandi prices and export destinations on the same crop page
- Tools: best mandi after transport, price history, MSP check, export destinations, unit converter
- AI that only explains numbers from our database, plus weekly briefs a human reviews before publishing
- Telegram price alerts, with no account and no phone number stored

Specification: [`SPEC.md`](SPEC.md). Design: [`DESIGN.md`](DESIGN.md). Decisions and their evidence: [`DECISIONS.md`](DECISIONS.md). Phase status and measurements: [`PROGRESS.md`](PROGRESS.md).

## Requirements

- Node 24 (`.nvmrc`) and pnpm 9
- PostgreSQL 17 or 18 (local or Neon)
- Redis (optional locally; Upstash in production)

## Local setup

```bash
pnpm install
cp .env.example .env.local          # fill in the values below
createdb mandiport && createdb mandiport_test
pnpm db:migrate && pnpm db:migrate:test
pnpm db:seed                        # categories and the states seen in real data
pnpm ingest:mandi                   # today's snapshot, about 80 seconds
pnpm ingest:backfill --days=30      # final data for the last 30 days (about a minute a day)
pnpm ingest:msp && pnpm ingest:exports && pnpm mappings:suggest
pnpm tiers                          # assign crop tiers from the data
pnpm dev
```

The only value you need to start is `DATAGOVIN_API_KEY` (free, from your data.gov.in account, under My Account → API key) plus a `DATABASE_URL`.

## Environment variables

Every variable is listed in `.env.example` and validated in `src/env.ts`. Formats are always checked; a feature that needs a value says so clearly when it is missing.

| Variable                                                   | Needed for                   | Notes                                                         |
| ---------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------- |
| `DATABASE_URL`                                             | everything                   | Local Postgres, or Neon's **pooled** connection string        |
| `DATABASE_URL_TEST`                                        | integration tests            | Must differ from `DATABASE_URL`; the suite truncates it       |
| `DATAGOVIN_API_KEY`                                        | ingestion                    | Free from data.gov.in                                         |
| `DATAGOVIN_RESOURCE_*`                                     | ingestion                    | Defaults in `.env.example` are the verified resource IDs      |
| `REDIS_URL`                                                | local caching                | Optional; without it the site runs with in-process counters   |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`       | production caching           | Used in preference to `REDIS_URL`                             |
| `AI_GATEWAY_API_KEY`, `AI_MODEL_ID`                        | Ask Mandiport and briefs     | Model verified on the gateway: `deepseek/deepseek-v4.1-flash` |
| `AI_DAILY_TOKEN_CAP`                                       | AI budget                    | Default 200,000 tokens a day                                  |
| `SARVAM_API_KEY`, `FEATURE_TRANSLATION`                    | Hindi brief drafts           | Off by default                                                |
| `OLA_MAPS_API_KEY`                                         | best-mandi distances         | Without it the tool ranks by price and says so                |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`            | alerts                       | Create the bot with @BotFather                                |
| `CRON_SECRET`                                              | cron and revalidation routes | 16+ characters                                                |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD`                         | `/admin`                     | Password 12+ characters                                       |
| `NEXT_PUBLIC_SITE_URL`                                     | links, sitemaps, alerts      | No trailing slash                                             |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`                            | analytics                    | Analytics only loads after consent                            |
| `NEXT_PUBLIC_GSC_VERIFICATION`                             | Search Console               | Meta-tag verification                                         |
| `NEXT_PUBLIC_ADS_ENABLED`, `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | ads                          | Keep ads off until hosting is upgraded                        |
| `SITEMAP_WAVE`                                             | indexing                     | 1 at launch, 2 after four weeks, 3 after eight                |
| `DB_SIZE_WARN_MB`                                          | admin warning                | Default 400                                                   |

## Scripts

| Command                                                                     | What it does                                          |
| --------------------------------------------------------------------------- | ----------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start`                                    | Next.js                                               |
| `pnpm check`                                                                | lint, typecheck and tests                             |
| `pnpm test` / `pnpm test:e2e`                                               | Vitest (unit + integration) / Playwright              |
| `pnpm db:migrate`, `pnpm db:migrate:test`, `pnpm db:seed`, `pnpm db:studio` | Database                                              |
| `pnpm ingest:mandi`                                                         | Current daily snapshot (provisional prices)           |
| `pnpm ingest:backfill --days=90`                                            | Final variety-wise data, skipping days already loaded |
| `pnpm ingest:msp`, `pnpm ingest:exports`, `pnpm mappings:suggest`           | MSP, exports, mapping suggestions                     |
| `pnpm rollups`, `pnpm tiers`                                                | Weekly/monthly rollups with retention; crop tiers     |
| `pnpm briefs:generate`, `pnpm alerts:send`                                  | AI brief drafts; Telegram alerts                      |
| `pnpm geocode:markets --limit=200`                                          | Fills market coordinates via Ola Maps                 |
| `pnpm discover-fields`, `pnpm pull-day`                                     | Data discovery helpers                                |
| `pnpm telegram:webhook`                                                     | Points Telegram at this deployment                    |

Playwright cannot always download its browser; `PLAYWRIGHT_CHANNEL=chrome pnpm test:e2e` uses installed Chrome instead.

## Deployment

### 1. Database (Neon)

Create a project, copy the **pooled** connection string into `DATABASE_URL`. Migrations run automatically at the start of each ingest workflow, or with `pnpm db:migrate`. Watch the database size on `/admin`: Neon Free is 0.5 GB, and 90 days of all-India data is around 0.5 GB (see PROGRESS.md).

### 2. Cache (Upstash)

Create a Redis database and copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. The free tier allows 500,000 commands a month; the site is built to stay far below that.

### 3. Hosting (Vercel)

Import the repository, add every environment variable, and deploy. `vercel.json` registers two cron jobs:

- `/api/cron/rollups` daily: recent rollups, and crop tiers on Mondays
- `/api/cron/ai-briefs` on Mondays: brief drafts in small batches

Both require `Authorization: Bearer $CRON_SECRET`, which Vercel sends automatically when `CRON_SECRET` is set.

### 4. Ingestion (GitHub Actions)

Heavy pulls run in Actions, not on Vercel. In the repository settings add:

- **Secrets:** `DATABASE_URL`, `DATAGOVIN_API_KEY`, `CRON_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `TELEGRAM_BOT_TOKEN`
- **Variables:** `DATAGOVIN_RESOURCE_MANDI_DAILY`, `DATAGOVIN_RESOURCE_MANDI_VARIETY`, `DATAGOVIN_RESOURCE_MSP`, `DATAGOVIN_RESOURCE_EXPORT_PRINCIPAL`, `NEXT_PUBLIC_SITE_URL`

Workflows skip themselves with a notice if the secrets are absent, so a fork never fails noisily.

### 5. Telegram

Create a bot with @BotFather, set `TELEGRAM_BOT_TOKEN`, choose a random `TELEGRAM_WEBHOOK_SECRET`, deploy, then run `pnpm telegram:webhook` once.

### 6. Analytics and Search Console

Create a GA4 property, set `NEXT_PUBLIC_GA_MEASUREMENT_ID`. Nothing loads until a visitor accepts the consent banner, and `/admin` is never measured. For Search Console, add the property, verify with `NEXT_PUBLIC_GSC_VERIFICATION`, and submit `https://your-domain/sitemap.xml`. Events are listed in `src/lib/analytics/index.ts`; check them in GA4 DebugView.

### 7. Ads (later)

`NEXT_PUBLIC_ADS_ENABLED` is `false` and must stay that way until hosting is upgraded: **Vercel Hobby is for non-commercial use, so ads require Vercel Pro.** When you do enable them, set `NEXT_PUBLIC_ADSENSE_CLIENT_ID` (which also generates `/ads.txt`), and expect AdSense to review the site's content and navigation first.

## Operating the site

- **`/admin`** (HTTP Basic auth): ingest runs and failures, rejected rows, database size, cache and AI usage, plus the review queues.
- **Confirm categories** at `/admin/categories`. Until a category is confirmed, its crops appear under "Others". There is a bulk "confirm suggestions" action.
- **Review export mappings** at `/admin/mappings`, highest tier first, and enter HS codes yourself.
- **Publish briefs** at `/admin/briefs`. Drafts never appear publicly.
- **Weekly review:** [`docs/WEEKLY_REVIEW.md`](docs/WEEKLY_REVIEW.md).
- **Before launch:** [`docs/LAUNCH_CHECKLIST.md`](docs/LAUNCH_CHECKLIST.md).

## Notes on the data.gov.in API

The API behaves differently from its documentation, and the client is built around that (evidence in DECISIONS.md D-005 to D-007, D-013, D-016):

- Filters must use `<field>.keyword` for exact matches; plain filters are full-text and relevance-ranked.
- Result order is **not stable between requests**, so paging loses rows. Each partition is fetched in one request instead.
- One query cannot reach past 10,000 rows, so a day is split state by state.
- The gateway allows about 60 requests a minute.
- Field names differ between datasets and between years of the same series.
- Node 24 needs classical TLS curves to connect to the host reliably.

## Licence and attribution

Data is used under the [Government Open Data License – India](https://www.data.gov.in/sites/default/files/Gazette_Notification_OGDL.pdf), and every page naming a figure names its source dataset. Mandiport is not affiliated with any government department. The site does not give financial or trading advice; see `/disclaimer`.
