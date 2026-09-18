import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetEnvCache } from "@/env";
import { keys } from "@/lib/cache/keys";
import { NoopStore, setCacheForTesting, type CacheStore } from "@/lib/cache/store";
import { afterIngest } from "@/lib/ingest/after-ingest";
import { registerDefaultPostIngestSteps } from "@/lib/ingest/post-steps";
import { closeTestDb, resetDb, testDb } from "../helpers/db";

/** Post-ingest cache invalidation and page revalidation (SPEC §6.7, §12). */

class RecordingStore extends NoopStore {
  deleted: string[] = [];
  override async del(keysToDelete: string[]): Promise<void> {
    this.deleted.push(...keysToDelete);
  }
}

const logger = { info: vi.fn(), warn: vi.fn() };

describe("post-ingest steps", () => {
  let store: RecordingStore;
  const originalFetch = globalThis.fetch;
  const originalEnv = { secret: process.env.CRON_SECRET, site: process.env.NEXT_PUBLIC_SITE_URL };

  beforeEach(async () => {
    // CI has no deployment to revalidate, so the test supplies both values itself.
    process.env.CRON_SECRET = "test-cron-secret-0123456789";
    process.env.NEXT_PUBLIC_SITE_URL = "https://mandiport.test";
    resetEnvCache();
    await resetDb();
    store = new RecordingStore();
    setCacheForTesting(store as unknown as CacheStore);
    logger.info.mockClear();
    logger.warn.mockClear();
    registerDefaultPostIngestSteps();
    await testDb().execute(sql`
      insert into commodities (source_name, display_name, slug, tier)
      values ('Onion', 'Onion', 'onion', 1), ('Tomato', 'Tomato', 'tomato', 1)`);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.CRON_SECRET = originalEnv.secret;
    process.env.NEXT_PUBLIC_SITE_URL = originalEnv.site;
    resetEnvCache();
  });

  afterAll(async () => {
    setCacheForTesting(undefined);
    await closeTestDb();
  });

  it("clears the cached pages of the crops that changed, and nothing else", async () => {
    globalThis.fetch = vi.fn(async () => new Response("{}", { status: 200 })) as unknown as typeof fetch;
    await afterIngest({ db: testDb(), logger, dates: ["2026-09-16"], commodityIds: [1] });

    expect(store.deleted).toContain(keys.hub("onion"));
    expect(store.deleted).toContain(keys.exports("onion"));
    expect(store.deleted).not.toContain(keys.hub("tomato"));
  });

  it("asks the site to revalidate those crop pages", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await afterIngest({ db: testDb(), logger, dates: ["2026-09-16"], commodityIds: [1, 2] });

    const call = fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit] | undefined;
    expect(String(call?.[0])).toBe("https://mandiport.test/api/revalidate");
    expect(call?.[1].method).toBe("POST");
    expect(
      String(call?.[1].headers ? (call[1].headers as Record<string, string>).authorization : ""),
    ).toMatch(/^Bearer .+/);
    expect(JSON.parse(String(call?.[1].body))).toEqual({ crops: ["onion", "tomato"] });
  });

  it("does nothing when no date changed", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await afterIngest({ db: testDb(), logger, dates: [], commodityIds: [1] });
    expect(store.deleted).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps going when revalidation fails, so ingestion is never lost", async () => {
    globalThis.fetch = vi.fn(async () => new Response("nope", { status: 500 })) as unknown as typeof fetch;
    await expect(
      afterIngest({ db: testDb(), logger, dates: ["2026-09-16"], commodityIds: [1] }),
    ).resolves.toBeUndefined();
    expect(store.deleted).toContain(keys.hub("onion"));
    expect(logger.warn).toHaveBeenCalledWith(
      "post-ingest step failed",
      expect.objectContaining({ step: "revalidate-pages" }),
    );
  });
});
