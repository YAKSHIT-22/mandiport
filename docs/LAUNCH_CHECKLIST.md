# Launch checklist

Work top to bottom. Anything unticked is a reason not to launch yet.

## Data

- [ ] Ingestion has run for at least 30 consecutive days without a failed run (`/admin` → ingest runs).
- [ ] Rejected rows are under 1% of rows fetched, and the reasons look like genuine bad data.
- [ ] Tiers have been recalculated in the last week, and Tier 1 looks sensible (the crops you would expect).
- [ ] Categories confirmed for every Tier 1 and Tier 2 crop (`/admin/categories`).
- [ ] Export mappings reviewed for every Tier 1 crop that has exports, with HS codes entered where you know them (`/admin/mappings`).
- [ ] MSP figures spot-checked against the government announcement for two crops.
- [ ] Spot-check three crop pages against data.gov.in directly: price, date and market count match.
- [ ] Database size is comfortably inside the plan, with headroom for another 90 days (`/admin`).

## Legal and trust

- [ ] `/about`, `/methodology`, `/privacy`, `/terms`, `/disclaimer` read correctly and name the real contact route.
- [ ] Privacy policy reviewed by a professional for DPDP Act compliance.
- [ ] Every page with data shows a source line and the GODL-India licence link.
- [ ] AI text is labelled everywhere it appears, and briefs say they were reviewed.
- [ ] Contact form delivers (send one test message and find it in the database).

## Product

- [ ] Every tool works on a phone, including with JavaScript disabled where it should.
- [ ] Best-mandi tool returns sensible distances for three real pincodes, or clearly says distances are unavailable.
- [ ] Ask Mandiport refuses an off-topic question and answers a price question with dates.
- [ ] At least four weekly briefs reviewed and published.
- [ ] Telegram alert created end to end: `/start`, code, form, message received, `/stop` removes it.
- [ ] 404 page, empty states and error states all suggest a next step.

## Technical

- [ ] `pnpm check` and `pnpm test:e2e` pass on the branch being deployed.
- [ ] CI is green on `main`.
- [ ] Lighthouse on production (mobile): Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO 100 on the home page, a Tier 1 crop hub, the best-mandi tool and a published brief.
- [ ] Security headers present on production (`curl -sI https://your-domain | grep -i content-security`).
- [ ] `/admin` returns 401 without credentials; `/api/cron/*` and `/api/revalidate` return 401 without the bearer token.
- [ ] `pnpm audit --prod` reports no known vulnerabilities.
- [ ] Cron jobs registered in Vercel, and each has run once successfully.
- [ ] GitHub Actions secrets and variables set; the daily ingest workflow has run against production.
- [ ] Telegram webhook registered against the production URL.

## Search

- [ ] `NEXT_PUBLIC_SITE_URL` is the final domain, and canonical URLs on three pages point at it.
- [ ] `SITEMAP_WAVE=1`. Sitemaps list only Tier 1 hubs, their qualifying state pages, guides, category hubs and static pages.
- [ ] `robots.txt` disallows `/admin` and `/api/`, and links the sitemap.
- [ ] Tier 3 crop pages and thin state or market pages carry `noindex, follow`.
- [ ] Search Console property verified and `sitemap.xml` submitted.
- [ ] Rich Results Test passes on a crop hub (Dataset) and a brief (Article).
- [ ] Open Graph image renders for a crop hub (paste the URL into a chat app).

## Analytics

- [ ] GA4 property created and `NEXT_PUBLIC_GA_MEASUREMENT_ID` set.
- [ ] Consent banner appears, declining loads no analytics, accepting is remembered.
- [ ] Events visible in DebugView: `crop_hub_view`, `tool_used`, `best_mandi_result`, `ask_question`.

## Ads (only if you have upgraded hosting)

- [ ] Vercel Pro (Hobby is non-commercial, so ads are not allowed on it).
- [ ] `NEXT_PUBLIC_ADSENSE_CLIENT_ID` set, `/ads.txt` returns the right line.
- [ ] `NEXT_PUBLIC_ADS_ENABLED=true` only after AdSense approval.

## Day one

- [ ] Watch `/admin` after the first production ingest: runtime, rows, rejects.
- [ ] Check Search Console coverage after 48 hours for unexpected exclusions.
- [ ] Note the first-week numbers in `docs/WEEKLY_REVIEW.md`.
