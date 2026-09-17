# Mandiport

Mandi prices and export demand, crop by crop, built on official Government of India data (data.gov.in).

The full build specification is in [`SPEC.md`](SPEC.md). Decisions and their evidence are in [`DECISIONS.md`](DECISIONS.md), and phase status and data measurements are in [`PROGRESS.md`](PROGRESS.md).

## Local setup

Requirements: Node 24 (`.nvmrc`) and pnpm 9.

```bash
pnpm install
cp .env.example .env.local   # then fill in values; see "Environment" below
pnpm dev
```

## Scripts

| Command                                              | What it does                                                                                                                                                                  |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start`             | Next.js                                                                                                                                                                       |
| `pnpm lint` / `pnpm typecheck` / `pnpm format:check` | Quality gates (also run in CI)                                                                                                                                                |
| `pnpm test`                                          | Unit + integration tests (Vitest)                                                                                                                                             |
| `pnpm test:e2e`                                      | Playwright; builds and starts the app on port 3100. If the browser download is blocked, use `PLAYWRIGHT_CHANNEL=chrome pnpm test:e2e` to run against installed Chrome.        |
| `pnpm discover-fields [name=<resource-id>]`          | Records real fields, filter behaviour and a 10-row sample for every configured data.gov.in resource into `tests/fixtures/`                                                    |
| `pnpm pull-day`                                      | Pulls the full current mandi snapshot (all states), writes name lists to `tests/fixtures/names/`, raw rows to `.data/pulls/` (gitignored), and prints a runtime/volume report |
| `pnpm exec tsx scripts/check-categories.ts`          | Shows how `data/category-rules.json` classifies the real commodity names                                                                                                      |

## Environment

Every variable is listed in `.env.example` and validated in `src/env.ts`. Phase 1 only needs `DATAGOVIN_API_KEY`, which you get from your data.gov.in account under My Account → API key.

## Notes on the data.gov.in API

The API differs from its documentation in ways that matter. Read DECISIONS.md D-005 to D-007 before changing the client:

- Filters must use `<field>.keyword`.
- Result order is unstable, so never page through mandi data.
- The gateway allows about 60 requests/minute.
- Node 24 needs classical TLS curves to connect reliably.
