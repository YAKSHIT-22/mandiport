import { describe, expect, it } from "vitest";
import { EnvError, parseEnv, requireEnv } from "@/env";

describe("env validation", () => {
  it("applies defaults and treats blank values as unset", () => {
    const env = parseEnv({ DATABASE_URL: "", DATAGOVIN_RESOURCE_MANDI_DAILY: "" });
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.DATAGOVIN_RESOURCE_MANDI_DAILY).toBe("9ef84268-d588-465a-a308-a864a43d0070");
    expect(env.AI_DAILY_TOKEN_CAP).toBe(200_000);
    expect(env.NEXT_PUBLIC_ADS_ENABLED).toBe(false);
    expect(env.FEATURE_TRANSLATION).toBe(false);
    expect(env.SITEMAP_WAVE).toBe(1);
    expect(env.DB_SIZE_WARN_MB).toBe(400);
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://mandiport.in");
  });

  it("parses flags and numbers", () => {
    const env = parseEnv({ NEXT_PUBLIC_ADS_ENABLED: "true", SITEMAP_WAVE: "3", AI_DAILY_TOKEN_CAP: "5000" });
    expect(env.NEXT_PUBLIC_ADS_ENABLED).toBe(true);
    expect(env.SITEMAP_WAVE).toBe(3);
    expect(env.AI_DAILY_TOKEN_CAP).toBe(5000);
  });

  it("rejects malformed values with a readable message", () => {
    expect(() =>
      parseEnv({
        DATAGOVIN_RESOURCE_MSP: "not-a-uuid",
        SITEMAP_WAVE: "4",
        NEXT_PUBLIC_GA_MEASUREMENT_ID: "UA-123",
        CRON_SECRET: "short",
      }),
    ).toThrow(/DATAGOVIN_RESOURCE_MSP[\s\S]*SITEMAP_WAVE|SITEMAP_WAVE[\s\S]*DATAGOVIN_RESOURCE_MSP/);
    expect(() => parseEnv({ NEXT_PUBLIC_ADS_ENABLED: "yes" })).toThrow(EnvError);
  });

  it("requireEnv names the missing variable", () => {
    const env = parseEnv({});
    expect(() => requireEnv("DATAGOVIN_API_KEY", env)).toThrow(/DATAGOVIN_API_KEY/);
    expect(requireEnv("DATAGOVIN_API_KEY", parseEnv({ DATAGOVIN_API_KEY: "abc" }))).toBe("abc");
  });
});
