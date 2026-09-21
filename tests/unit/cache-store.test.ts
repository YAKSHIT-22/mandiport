import { afterEach, describe, expect, it } from "vitest";
import { resetEnvCache } from "@/env";
import { getCache, setCacheForTesting } from "@/lib/cache/store";

/**
 * A cache is optional. A REDIS_URL that is not a redis URL — a stray token, a hostname — must
 * degrade to no cache rather than hang the request (it once timed out API routes in production).
 */
describe("cache store", () => {
  const original = process.env.REDIS_URL;

  afterEach(() => {
    if (original === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = original;
    resetEnvCache();
    setCacheForTesting(undefined);
  });

  it("falls back to no cache when REDIS_URL is not a redis URL", async () => {
    process.env.REDIS_URL = "http://example.com";
    resetEnvCache();
    setCacheForTesting(undefined);
    const store = await Promise.race([
      getCache(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("hung")), 5_000)),
    ]);
    expect(store.kind).toBe("none");
  });
});
