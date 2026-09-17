-- Fuzzy search and name resolution (search API, AI tools). pg_trgm is available on Neon.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "commodities_display_name_trgm_idx" ON "commodities" USING gin (lower("display_name") gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "markets_name_trgm_idx" ON "markets" USING gin (lower("name") gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "varieties_display_name_trgm_idx" ON "varieties" USING gin (lower("display_name") gin_trgm_ops);
