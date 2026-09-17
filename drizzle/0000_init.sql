CREATE TABLE "ai_briefs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ai_briefs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"commodity_id" integer NOT NULL,
	"week_start" date NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"headline" text NOT NULL,
	"body_md" text NOT NULL,
	"facts_json" jsonb NOT NULL,
	"model_id" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_briefs_commodity_id_week_start_language_unique" UNIQUE("commodity_id","week_start","language"),
	CONSTRAINT "ai_briefs_status_check" CHECK ("ai_briefs"."status" in ('draft', 'published'))
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "alerts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"telegram_chat_id" text NOT NULL,
	"commodity_id" integer NOT NULL,
	"market_id" integer,
	"state_id" integer,
	"direction" text NOT NULL,
	"threshold" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_triggered_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alerts_direction_check" CHECK ("alerts"."direction" in ('above', 'below'))
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "commodities" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "commodities_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"source_name" text NOT NULL,
	"display_name" text NOT NULL,
	"name_hi" text,
	"slug" text NOT NULL,
	"category_id" integer,
	"category_confirmed" boolean DEFAULT false NOT NULL,
	"tier" smallint DEFAULT 3 NOT NULL,
	"markets_reporting_90d" integer DEFAULT 0 NOT NULL,
	"days_reported_90d" integer DEFAULT 0 NOT NULL,
	"tier_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commodities_source_name_unique" UNIQUE("source_name"),
	CONSTRAINT "commodities_slug_unique" UNIQUE("slug"),
	CONSTRAINT "commodities_tier_check" CHECK ("commodities"."tier" in (1, 2, 3))
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "contact_messages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"email" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "countries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"slug" text NOT NULL,
	"iso2" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "countries_name_unique" UNIQUE("name"),
	CONSTRAINT "countries_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "crop_mapping" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "crop_mapping_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"commodity_id" integer NOT NULL,
	"export_commodity_id" integer NOT NULL,
	"hs_code" text,
	"notes" text,
	"confidence" numeric(4, 3),
	"status" text DEFAULT 'suggested' NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crop_mapping_commodity_id_export_commodity_id_unique" UNIQUE("commodity_id","export_commodity_id"),
	CONSTRAINT "crop_mapping_status_check" CHECK ("crop_mapping"."status" in ('suggested', 'verified', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "districts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"state_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "districts_state_id_slug_unique" UNIQUE("state_id","slug"),
	CONSTRAINT "districts_state_id_name_unique" UNIQUE("state_id","name")
);
--> statement-breakpoint
CREATE TABLE "export_commodities" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "export_commodities_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"source_name" text NOT NULL,
	"display_name" text NOT NULL,
	"slug" text NOT NULL,
	"unit" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "export_commodities_source_name_unique" UNIQUE("source_name"),
	CONSTRAINT "export_commodities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "exports_annual" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "exports_annual_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"year" text NOT NULL,
	"export_commodity_id" integer NOT NULL,
	"country_id" integer,
	"quantity" numeric,
	"unit" text,
	"value_usd_million" numeric NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exports_annual_natural_key" UNIQUE NULLS NOT DISTINCT("year","export_commodity_id","country_id","source")
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "grades_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	CONSTRAINT "grades_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ingest_rejects" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ingest_rejects_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"run_id" integer NOT NULL,
	"raw" jsonb NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingest_runs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ingest_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"job" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text DEFAULT 'running' NOT NULL,
	"rows_fetched" integer DEFAULT 0 NOT NULL,
	"rows_upserted" integer DEFAULT 0 NOT NULL,
	"rows_rejected" integer DEFAULT 0 NOT NULL,
	"error" text,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"checkpoint" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "markets" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "markets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"district_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"geocode_confidence" text,
	"geocoded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "markets_district_id_slug_unique" UNIQUE("district_id","slug"),
	CONSTRAINT "markets_district_id_name_unique" UNIQUE("district_id","name")
);
--> statement-breakpoint
CREATE TABLE "msp" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "msp_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"source_name" text NOT NULL,
	"variety" text,
	"commodity_id" integer,
	"season" text NOT NULL,
	"year" text NOT NULL,
	"msp_price" integer NOT NULL,
	"resource_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "msp_natural_key" UNIQUE NULLS NOT DISTINCT("source_name","variety","season","year")
);
--> statement-breakpoint
CREATE TABLE "prices_daily" (
	"arrival_date" date NOT NULL,
	"market_id" integer NOT NULL,
	"commodity_id" integer NOT NULL,
	"variety_id" integer,
	"grade_id" smallint,
	"source" smallint NOT NULL,
	"min_price" integer NOT NULL,
	"max_price" integer NOT NULL,
	"modal_price" integer NOT NULL,
	CONSTRAINT "prices_daily_natural_key" UNIQUE NULLS NOT DISTINCT("market_id","commodity_id","arrival_date","variety_id","grade_id")
);
--> statement-breakpoint
CREATE TABLE "prices_market_daily" (
	"arrival_date" date NOT NULL,
	"market_id" integer NOT NULL,
	"commodity_id" integer NOT NULL,
	"state_id" integer NOT NULL,
	"modal_price" integer NOT NULL,
	"min_price" integer NOT NULL,
	"max_price" integer NOT NULL,
	CONSTRAINT "prices_market_daily_commodity_id_arrival_date_market_id_pk" PRIMARY KEY("commodity_id","arrival_date","market_id")
);
--> statement-breakpoint
CREATE TABLE "prices_monthly" (
	"month" date NOT NULL,
	"market_id" integer NOT NULL,
	"commodity_id" integer NOT NULL,
	"avg_modal" integer NOT NULL,
	"min_modal" integer NOT NULL,
	"max_modal" integer NOT NULL,
	"days_reported" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prices_monthly_commodity_id_market_id_month_pk" PRIMARY KEY("commodity_id","market_id","month")
);
--> statement-breakpoint
CREATE TABLE "prices_national_daily" (
	"arrival_date" date NOT NULL,
	"commodity_id" integer NOT NULL,
	"median_modal" integer NOT NULL,
	"min_modal" integer NOT NULL,
	"max_modal" integer NOT NULL,
	"markets_reporting" integer NOT NULL,
	"states_reporting" integer NOT NULL,
	CONSTRAINT "prices_national_daily_commodity_id_arrival_date_pk" PRIMARY KEY("commodity_id","arrival_date")
);
--> statement-breakpoint
CREATE TABLE "prices_state_daily" (
	"arrival_date" date NOT NULL,
	"state_id" integer NOT NULL,
	"commodity_id" integer NOT NULL,
	"median_modal" integer NOT NULL,
	"markets_reporting" integer NOT NULL,
	CONSTRAINT "prices_state_daily_commodity_id_state_id_arrival_date_pk" PRIMARY KEY("commodity_id","state_id","arrival_date")
);
--> statement-breakpoint
CREATE TABLE "prices_weekly" (
	"week_start" date NOT NULL,
	"market_id" integer NOT NULL,
	"commodity_id" integer NOT NULL,
	"avg_modal" integer NOT NULL,
	"min_modal" integer NOT NULL,
	"max_modal" integer NOT NULL,
	"days_reported" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prices_weekly_commodity_id_market_id_week_start_pk" PRIMARY KEY("commodity_id","market_id","week_start")
);
--> statement-breakpoint
CREATE TABLE "states" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "states_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "states_name_unique" UNIQUE("name"),
	CONSTRAINT "states_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "telegram_links" (
	"code" text PRIMARY KEY NOT NULL,
	"telegram_chat_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tier_changes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tier_changes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"commodity_id" integer NOT NULL,
	"from_tier" smallint NOT NULL,
	"to_tier" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "varieties" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "varieties_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"commodity_id" integer NOT NULL,
	"source_name" text NOT NULL,
	"display_name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "varieties_commodity_id_slug_unique" UNIQUE("commodity_id","slug"),
	CONSTRAINT "varieties_commodity_id_source_name_unique" UNIQUE("commodity_id","source_name")
);
--> statement-breakpoint
ALTER TABLE "ai_briefs" ADD CONSTRAINT "ai_briefs_commodity_id_commodities_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "public"."commodities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_commodity_id_commodities_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "public"."commodities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commodities" ADD CONSTRAINT "commodities_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crop_mapping" ADD CONSTRAINT "crop_mapping_commodity_id_commodities_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "public"."commodities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crop_mapping" ADD CONSTRAINT "crop_mapping_export_commodity_id_export_commodities_id_fk" FOREIGN KEY ("export_commodity_id") REFERENCES "public"."export_commodities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exports_annual" ADD CONSTRAINT "exports_annual_export_commodity_id_export_commodities_id_fk" FOREIGN KEY ("export_commodity_id") REFERENCES "public"."export_commodities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exports_annual" ADD CONSTRAINT "exports_annual_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingest_rejects" ADD CONSTRAINT "ingest_rejects_run_id_ingest_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ingest_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "markets" ADD CONSTRAINT "markets_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "msp" ADD CONSTRAINT "msp_commodity_id_commodities_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "public"."commodities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prices_daily" ADD CONSTRAINT "prices_daily_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prices_daily" ADD CONSTRAINT "prices_daily_commodity_id_commodities_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "public"."commodities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prices_daily" ADD CONSTRAINT "prices_daily_variety_id_varieties_id_fk" FOREIGN KEY ("variety_id") REFERENCES "public"."varieties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prices_daily" ADD CONSTRAINT "prices_daily_grade_id_grades_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."grades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tier_changes" ADD CONSTRAINT "tier_changes_commodity_id_commodities_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "public"."commodities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "varieties" ADD CONSTRAINT "varieties_commodity_id_commodities_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "public"."commodities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_briefs_status_week_start_index" ON "ai_briefs" USING btree ("status","week_start");--> statement-breakpoint
CREATE INDEX "alerts_active_commodity_id_index" ON "alerts" USING btree ("active","commodity_id");--> statement-breakpoint
CREATE INDEX "alerts_telegram_chat_id_index" ON "alerts" USING btree ("telegram_chat_id");--> statement-breakpoint
CREATE INDEX "commodities_tier_index" ON "commodities" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "exports_annual_export_commodity_id_year_index" ON "exports_annual" USING btree ("export_commodity_id","year");--> statement-breakpoint
CREATE INDEX "ingest_rejects_run_id_index" ON "ingest_rejects" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "ingest_rejects_created_at_index" ON "ingest_rejects" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ingest_runs_job_started_at_index" ON "ingest_runs" USING btree ("job","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "msp_commodity_id_index" ON "msp" USING btree ("commodity_id");--> statement-breakpoint
CREATE INDEX "prices_daily_commodity_date_idx" ON "prices_daily" USING btree ("commodity_id","arrival_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "prices_market_daily_market_idx" ON "prices_market_daily" USING btree ("market_id","commodity_id","arrival_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "prices_market_daily_state_idx" ON "prices_market_daily" USING btree ("state_id","commodity_id","arrival_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "prices_state_daily_date_idx" ON "prices_state_daily" USING btree ("arrival_date");