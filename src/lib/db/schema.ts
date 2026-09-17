import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

/**
 * Database schema (SPEC §6.2). Deviations are recorded in DECISIONS.md D-011:
 * - prices_daily uses the measured compact layout: no surrogate id or timestamps,
 *   grade and source as small integers, source not part of the natural key.
 * - prices_national_daily added for the national median on crop hubs.
 */

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

const id = () => integer("id").primaryKey().generatedAlwaysAsIdentity();

// ─── Dimensions ────────────────────────────────────────────────────────────────

export const states = pgTable("states", {
  id: id(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  ...timestamps,
});

export const districts = pgTable(
  "districts",
  {
    id: id(),
    stateId: integer("state_id")
      .notNull()
      .references(() => states.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    ...timestamps,
  },
  (t) => [unique().on(t.stateId, t.slug), unique().on(t.stateId, t.name)],
);

export const markets = pgTable(
  "markets",
  {
    id: id(),
    districtId: integer("district_id")
      .notNull()
      .references(() => districts.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    /** 'high' | 'low' | 'failed'. Null until geocoded (SPEC §8.4). */
    geocodeConfidence: text("geocode_confidence"),
    geocodedAt: timestamp("geocoded_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [unique().on(t.districtId, t.slug), unique().on(t.districtId, t.name)],
);

export const categories = pgTable("categories", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const commodities = pgTable(
  "commodities",
  {
    id: id(),
    sourceName: text("source_name").notNull().unique(),
    displayName: text("display_name").notNull(),
    /** Hindi name for search and future i18n; null until provided. */
    nameHi: text("name_hi"),
    slug: text("slug").notNull().unique(),
    categoryId: integer("category_id").references(() => categories.id),
    categoryConfirmed: boolean("category_confirmed").notNull().default(false),
    tier: smallint("tier").notNull().default(3),
    marketsReporting90d: integer("markets_reporting_90d").notNull().default(0),
    daysReported90d: integer("days_reported_90d").notNull().default(0),
    tierUpdatedAt: timestamp("tier_updated_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [check("commodities_tier_check", sql`${t.tier} in (1, 2, 3)`), index().on(t.tier)],
);

export const varieties = pgTable(
  "varieties",
  {
    id: id(),
    commodityId: integer("commodity_id")
      .notNull()
      .references(() => commodities.id),
    sourceName: text("source_name").notNull(),
    displayName: text("display_name").notNull(),
    slug: text("slug").notNull(),
    ...timestamps,
  },
  (t) => [unique().on(t.commodityId, t.slug), unique().on(t.commodityId, t.sourceName)],
);

export const grades = pgTable("grades", {
  id: smallint("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
});

// ─── Prices ────────────────────────────────────────────────────────────────────

/** 1 = current daily snapshot (provisional), 2 = variety-wise history (final). */
export const PRICE_SOURCE = { mandiDaily: 1, mandiVariety: 2 } as const;
export type PriceSource = (typeof PRICE_SOURCE)[keyof typeof PRICE_SOURCE];

export const pricesDaily = pgTable(
  "prices_daily",
  {
    arrivalDate: date("arrival_date").notNull(),
    marketId: integer("market_id")
      .notNull()
      .references(() => markets.id),
    commodityId: integer("commodity_id")
      .notNull()
      .references(() => commodities.id),
    varietyId: integer("variety_id").references(() => varieties.id),
    gradeId: smallint("grade_id").references(() => grades.id),
    source: smallint("source").notNull(),
    /** ₹/quintal */
    minPrice: integer("min_price").notNull(),
    maxPrice: integer("max_price").notNull(),
    modalPrice: integer("modal_price").notNull(),
  },
  (t) => [
    // Ordered so it also serves market + commodity + date-range lookups.
    unique("prices_daily_natural_key")
      .on(t.marketId, t.commodityId, t.arrivalDate, t.varietyId, t.gradeId)
      .nullsNotDistinct(),
    index("prices_daily_commodity_date_idx").on(t.commodityId, t.arrivalDate.desc()),
  ],
);

export const pricesMarketDaily = pgTable(
  "prices_market_daily",
  {
    arrivalDate: date("arrival_date").notNull(),
    marketId: integer("market_id").notNull(),
    commodityId: integer("commodity_id").notNull(),
    stateId: integer("state_id").notNull(),
    /** Median modal across the market's variety/grade rows for that day. */
    modalPrice: integer("modal_price").notNull(),
    minPrice: integer("min_price").notNull(),
    maxPrice: integer("max_price").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.commodityId, t.arrivalDate, t.marketId] }),
    index("prices_market_daily_market_idx").on(t.marketId, t.commodityId, t.arrivalDate.desc()),
    index("prices_market_daily_state_idx").on(t.stateId, t.commodityId, t.arrivalDate.desc()),
  ],
);

export const pricesStateDaily = pgTable(
  "prices_state_daily",
  {
    arrivalDate: date("arrival_date").notNull(),
    stateId: integer("state_id").notNull(),
    commodityId: integer("commodity_id").notNull(),
    medianModal: integer("median_modal").notNull(),
    marketsReporting: integer("markets_reporting").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.commodityId, t.stateId, t.arrivalDate] }),
    index("prices_state_daily_date_idx").on(t.arrivalDate),
  ],
);

export const pricesNationalDaily = pgTable(
  "prices_national_daily",
  {
    arrivalDate: date("arrival_date").notNull(),
    commodityId: integer("commodity_id").notNull(),
    medianModal: integer("median_modal").notNull(),
    minModal: integer("min_modal").notNull(),
    maxModal: integer("max_modal").notNull(),
    marketsReporting: integer("markets_reporting").notNull(),
    statesReporting: integer("states_reporting").notNull(),
  },
  (t) => [primaryKey({ columns: [t.commodityId, t.arrivalDate] })],
);

const rollupColumns = {
  marketId: integer("market_id").notNull(),
  commodityId: integer("commodity_id").notNull(),
  avgModal: integer("avg_modal").notNull(),
  minModal: integer("min_modal").notNull(),
  maxModal: integer("max_modal").notNull(),
  daysReported: integer("days_reported").notNull(),
  ...timestamps,
};

/** Market-level weekly rollup (per market, not per variety: see D-011). */
export const pricesWeekly = pgTable(
  "prices_weekly",
  { weekStart: date("week_start").notNull(), ...rollupColumns },
  (t) => [primaryKey({ columns: [t.commodityId, t.marketId, t.weekStart] })],
);

export const pricesMonthly = pgTable(
  "prices_monthly",
  { month: date("month").notNull(), ...rollupColumns },
  (t) => [primaryKey({ columns: [t.commodityId, t.marketId, t.month] })],
);

// ─── MSP ───────────────────────────────────────────────────────────────────────

export const msp = pgTable(
  "msp",
  {
    id: id(),
    /** Name as published, e.g. "Paddy". */
    sourceName: text("source_name").notNull(),
    variety: text("variety"),
    commodityId: integer("commodity_id").references(() => commodities.id),
    /** 'kharif' | 'rabi' | 'other' */
    season: text("season").notNull(),
    /** Marketing season label, e.g. "2025-26". */
    year: text("year").notNull(),
    mspPrice: integer("msp_price").notNull(),
    resourceId: text("resource_id").notNull(),
    ...timestamps,
  },
  (t) => [
    unique("msp_natural_key").on(t.sourceName, t.variety, t.season, t.year).nullsNotDistinct(),
    index().on(t.commodityId),
  ],
);

// ─── Exports ───────────────────────────────────────────────────────────────────

export const exportCommodities = pgTable("export_commodities", {
  id: id(),
  sourceName: text("source_name").notNull().unique(),
  displayName: text("display_name").notNull(),
  slug: text("slug").notNull().unique(),
  unit: text("unit"),
  ...timestamps,
});

export const countries = pgTable("countries", {
  id: id(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  slug: text("slug").notNull().unique(),
  iso2: text("iso2"),
  ...timestamps,
});

export const exportsAnnual = pgTable(
  "exports_annual",
  {
    id: id(),
    /** Financial year label, e.g. "2022-23". */
    year: text("year").notNull(),
    exportCommodityId: integer("export_commodity_id")
      .notNull()
      .references(() => exportCommodities.id),
    /** Null = all countries (computed total). */
    countryId: integer("country_id").references(() => countries.id),
    quantity: numeric("quantity"),
    unit: text("unit"),
    valueUsdMillion: numeric("value_usd_million").notNull(),
    source: text("source").notNull(),
    ...timestamps,
  },
  (t) => [
    unique("exports_annual_natural_key")
      .on(t.year, t.exportCommodityId, t.countryId, t.source)
      .nullsNotDistinct(),
    index().on(t.exportCommodityId, t.year),
  ],
);

export const cropMapping = pgTable(
  "crop_mapping",
  {
    id: id(),
    commodityId: integer("commodity_id")
      .notNull()
      .references(() => commodities.id),
    exportCommodityId: integer("export_commodity_id")
      .notNull()
      .references(() => exportCommodities.id),
    /** Entered by a human only; never auto-filled (SPEC §6.6). */
    hsCode: text("hs_code"),
    notes: text("notes"),
    confidence: numeric("confidence", { precision: 4, scale: 3 }),
    /** 'suggested' | 'verified' | 'rejected' */
    status: text("status").notNull().default("suggested"),
    verified: boolean("verified").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    unique().on(t.commodityId, t.exportCommodityId),
    check("crop_mapping_status_check", sql`${t.status} in ('suggested', 'verified', 'rejected')`),
  ],
);

// ─── AI ────────────────────────────────────────────────────────────────────────

export const aiBriefs = pgTable(
  "ai_briefs",
  {
    id: id(),
    commodityId: integer("commodity_id")
      .notNull()
      .references(() => commodities.id),
    weekStart: date("week_start").notNull(),
    language: text("language").notNull().default("en"),
    headline: text("headline").notNull(),
    bodyMd: text("body_md").notNull(),
    factsJson: jsonb("facts_json").notNull(),
    modelId: text("model_id").notNull(),
    status: text("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    unique().on(t.commodityId, t.weekStart, t.language),
    check("ai_briefs_status_check", sql`${t.status} in ('draft', 'published')`),
    index().on(t.status, t.weekStart),
  ],
);

// ─── Alerts ────────────────────────────────────────────────────────────────────

export const alerts = pgTable(
  "alerts",
  {
    id: id(),
    telegramChatId: text("telegram_chat_id").notNull(),
    commodityId: integer("commodity_id")
      .notNull()
      .references(() => commodities.id),
    marketId: integer("market_id").references(() => markets.id),
    stateId: integer("state_id").references(() => states.id),
    direction: text("direction").notNull(),
    threshold: integer("threshold").notNull(),
    active: boolean("active").notNull().default(true),
    lastTriggeredOn: date("last_triggered_on"),
    ...timestamps,
  },
  (t) => [
    check("alerts_direction_check", sql`${t.direction} in ('above', 'below')`),
    index().on(t.active, t.commodityId),
    index().on(t.telegramChatId),
  ],
);

/** One-time codes linking a Telegram chat to the website form (SPEC §8.9). */
export const telegramLinks = pgTable("telegram_links", {
  code: text("code").primaryKey(),
  telegramChatId: text("telegram_chat_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  ...timestamps,
});

// ─── Contact ───────────────────────────────────────────────────────────────────

export const contactMessages = pgTable("contact_messages", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  ...timestamps,
});

// ─── Ingestion bookkeeping ─────────────────────────────────────────────────────

export const ingestRuns = pgTable(
  "ingest_runs",
  {
    id: id(),
    job: text("job").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    /** 'running' | 'success' | 'partial' | 'failed' */
    status: text("status").notNull().default("running"),
    rowsFetched: integer("rows_fetched").notNull().default(0),
    rowsUpserted: integer("rows_upserted").notNull().default(0),
    rowsRejected: integer("rows_rejected").notNull().default(0),
    error: text("error"),
    /** Job parameters, e.g. { date: "2026-09-16" }. */
    params: jsonb("params").notNull().default({}),
    /** Completed partition keys, so a failed run can resume (SPEC §6.7). */
    checkpoint: jsonb("checkpoint").notNull().default({}),
    ...timestamps,
  },
  (t) => [index().on(t.job, t.startedAt.desc())],
);

export const ingestRejects = pgTable(
  "ingest_rejects",
  {
    id: id(),
    runId: integer("run_id")
      .notNull()
      .references(() => ingestRuns.id, { onDelete: "cascade" }),
    raw: jsonb("raw").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.runId), index().on(t.createdAt)],
);

/** Tier changes, logged every Monday (SPEC §6.4). */
export const tierChanges = pgTable("tier_changes", {
  id: id(),
  commodityId: integer("commodity_id")
    .notNull()
    .references(() => commodities.id),
  fromTier: smallint("from_tier").notNull(),
  toTier: smallint("to_tier").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
