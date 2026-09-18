# Weekly review

Fifteen minutes, once a week. Copy the template, fill in the numbers, answer the four questions.

## Where to look

**Admin (`/admin`)**

- Ingest success rate over 30 days, by job. Anything below 95% needs investigating.
- Runs that took longer than 45 minutes, or that show as "interrupted".
- Rejected rows in the last 7 days, by reason. A new reason appearing means the source data changed.
- Database size, against the plan limit and the warning threshold.
- AI tokens used today against the cap, and cache status.
- Items waiting for review: categories, export mappings, draft briefs.

**GA4**

- Users, sessions, and returning users.
- Top pages: which crops people actually read.
- Events per tool: `tool_used`, `best_mandi_result`, `ask_question`, `alert_created`.
- Refusals: `ask_refused` with reasons, which shows what people expect that we do not answer.

**Search Console**

- Impressions and clicks, week on week.
- Top queries: the words people use, which rarely match ours.
- Pages indexed versus excluded, and the reason for exclusions.
- Any manual actions or coverage errors.

## Template

```
Week ending: ____

Data
- Ingest success (30d): mandi-daily __/__, mandi-variety __/__
- Longest run: __ min
- Rejected rows (7d): __ (top reason: ______)
- Database size: __ MB of __ MB
- Waiting for review: __ categories, __ mappings, __ draft briefs

Audience
- Users: __ (last week __)
- Returning users: __%
- Top five pages: ______
- Tool uses: best-mandi __, price-history __, msp-check __, exports __, ask __
- Ask refusals: __ (reasons: ______)

Search
- Impressions: __ (last week __)
- Clicks: __ (CTR __%)
- Indexed: __ / excluded: __ (top reason: ______)
- Top five queries: ______

Decisions
1. Which tool earned its place this week, and which did not?
2. Which crop pages are getting impressions, and do they deserve a guide?
3. What did people ask that we could not answer?
4. One thing to add, and one thing to remove.
```

## Rhythm

- **Week 4:** if indexing looks healthy, set `SITEMAP_WAVE=2` to add Tier 2 crop hubs.
- **Week 8:** if still healthy, set `SITEMAP_WAVE=3` to add qualifying market pages.
- **Monthly:** re-run `pnpm mappings:suggest`, review new suggestions, and confirm categories for any new crops.
- **Quarterly:** re-check storage growth against the plan, and re-read `PROGRESS.md` projections against reality.
