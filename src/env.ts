import { z } from "zod";

/**
 * Environment validation.
 *
 * Every variable from SPEC §4 is declared here. Format is always validated, but most
 * services arrive in later phases, so presence is enforced where a feature actually
 * needs the value (`requireEnv`) rather than at import time. See DECISIONS.md D-004.
 */

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalString = z.preprocess(blankToUndefined, z.string().optional());
const optionalUrl = z.preprocess(blankToUndefined, z.url().optional());
const resourceId = z.preprocess(
  blankToUndefined,
  z
    .string()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      "must be a data.gov.in resource UUID",
    )
    .optional(),
);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const resourceIdList = z.preprocess(
  blankToUndefined,
  z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
        : [],
    )
    .refine((ids) => ids.every((x) => UUID_RE.test(x)), "must be comma-separated resource UUIDs"),
);
const yearResourceList = z.preprocess(
  blankToUndefined,
  z
    .string()
    .optional()
    .transform((v) =>
      (v
        ? v
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
        : []
      ).map((pair) => {
        const [year = "", resourceId = ""] = pair.split(":").map((x) => x.trim());
        return { year, resourceId };
      }),
    )
    .refine(
      (items) => items.every((i) => /^\d{4}-\d{2}$/.test(i.year) && UUID_RE.test(i.resourceId)),
      "must be comma-separated YYYY-YY:<resource-uuid> pairs",
    ),
);
const flag = (fallback: boolean) =>
  z.preprocess(
    blankToUndefined,
    z
      .enum(["true", "false", "1", "0"])
      .optional()
      .transform((v) => (v === undefined ? fallback : v === "true" || v === "1")),
  );
const positiveInt = (fallback: number) =>
  z.preprocess(blankToUndefined, z.coerce.number().int().positive().default(fallback));

export const envSchema = z.object({
  // Database
  DATABASE_URL: optionalUrl,
  /** Separate database for integration tests (local only). */
  DATABASE_URL_TEST: optionalUrl,

  // Redis: Upstash REST in production, or a plain Redis URL for local development.
  REDIS_URL: optionalUrl,
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: optionalString,

  // data.gov.in
  DATAGOVIN_API_KEY: optionalString,
  DATAGOVIN_RESOURCE_MANDI_DAILY: z.preprocess(
    blankToUndefined,
    resourceId.default("9ef84268-d588-465a-a308-a864a43d0070"),
  ),
  DATAGOVIN_RESOURCE_MANDI_VARIETY: resourceId,
  /** Comma-separated resource IDs; MSP is published as several tables. */
  DATAGOVIN_RESOURCE_MSP: resourceIdList,
  /** Comma-separated `YYYY-YY:<resource-id>`; exports are published one resource per year. */
  DATAGOVIN_RESOURCE_EXPORT_PRINCIPAL: yearResourceList,
  DATAGOVIN_RESOURCE_EXPORT_COUNTRYWISE: yearResourceList,

  // AI
  AI_GATEWAY_API_KEY: optionalString,
  AI_MODEL_ID: optionalString,
  AI_DAILY_TOKEN_CAP: positiveInt(200_000),
  SARVAM_API_KEY: optionalString,
  FEATURE_TRANSLATION: flag(false),

  // Maps
  OLA_MAPS_API_KEY: optionalString,

  // Telegram
  TELEGRAM_BOT_TOKEN: optionalString,
  TELEGRAM_WEBHOOK_SECRET: optionalString,

  // Security
  CRON_SECRET: z.preprocess(blankToUndefined, z.string().min(16, "use at least 16 characters").optional()),
  ADMIN_USERNAME: optionalString,
  ADMIN_PASSWORD: z.preprocess(blankToUndefined, z.string().min(12, "use at least 12 characters").optional()),

  // Site
  NEXT_PUBLIC_SITE_URL: z.preprocess(blankToUndefined, z.url().default("https://mandiport.in")),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.preprocess(
    blankToUndefined,
    z
      .string()
      .regex(/^G-[A-Z0-9]+$/, "must look like G-XXXXXXX")
      .optional(),
  ),
  NEXT_PUBLIC_GSC_VERIFICATION: optionalString,
  NEXT_PUBLIC_ADS_ENABLED: flag(false),
  NEXT_PUBLIC_ADSENSE_CLIENT_ID: z.preprocess(
    blankToUndefined,
    z
      .string()
      .regex(/^ca-pub-\d+$/, "must look like ca-pub-1234567890")
      .optional(),
  ),

  // Scale controls
  SITEMAP_WAVE: z.preprocess(blankToUndefined, z.enum(["1", "2", "3"]).default("1").transform(Number)),
  DB_SIZE_WARN_MB: positiveInt(400),
});

export type Env = z.infer<typeof envSchema>;

export class EnvError extends Error {
  override name = "EnvError";
}

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const lines = result.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`);
    throw new EnvError(`Invalid environment variables:\n${lines.join("\n")}`);
  }
  return result.data;
}

let cached: Env | undefined;

/** Clears the cached environment so tests can change process.env. Tests only. */
export function resetEnvCache(): void {
  cached = undefined;
}

/** Validated environment. Parsed once, on first access. */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}

/** Returns a variable that the calling feature cannot work without, or throws a clear error. */
export function requireEnv<K extends keyof Env>(key: K, env: Env = getEnv()): NonNullable<Env[K]> {
  const value = env[key];
  if (value === undefined || value === null) {
    throw new EnvError(`Missing environment variable ${key}. Add it to .env.local (see .env.example).`);
  }
  return value as NonNullable<Env[K]>;
}
