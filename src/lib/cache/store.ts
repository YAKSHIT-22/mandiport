import { getEnv } from "@/env";

/**
 * Minimal key-value interface over Upstash Redis (production, REST) or a plain Redis server
 * (local development). If neither is configured, a no-op store is used and features fall
 * back to direct queries. See DECISIONS.md D-014.
 */
export interface CacheStore {
  readonly kind: "upstash" | "redis" | "none";
  getJson<T>(key: string): Promise<T | null>;
  setJson(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  del(keys: string[]): Promise<void>;
  /** INCRBY, setting the TTL only when the key is new. Returns the new value. */
  incrBy(key: string, by: number, ttlSeconds: number): Promise<number>;
  getNumber(key: string): Promise<number>;
  /** Commands processed (local Redis only), for the admin estimate. */
  commandsProcessed?(): Promise<number | null>;
}

class NoopStore implements CacheStore {
  readonly kind = "none" as const;
  private counters = new Map<string, { value: number; expires: number }>();
  async getJson<T>(): Promise<T | null> {
    return null;
  }
  async setJson(): Promise<void> {}
  async del(keys: string[]): Promise<void> {
    void keys;
  }
  // Counters still work in-process so rate limits and token caps are enforced without Redis.
  async incrBy(key: string, by: number, ttlSeconds: number): Promise<number> {
    const now = Date.now();
    const current = this.counters.get(key);
    const value = current && current.expires > now ? current.value + by : by;
    this.counters.set(key, {
      value,
      expires: current && current.expires > now ? current.expires : now + ttlSeconds * 1000,
    });
    return value;
  }
  async getNumber(key: string): Promise<number> {
    const current = this.counters.get(key);
    return current && current.expires > Date.now() ? current.value : 0;
  }
}

async function createUpstashStore(url: string, token: string): Promise<CacheStore> {
  const { Redis } = await import("@upstash/redis");
  const redis = new Redis({ url, token });
  return {
    kind: "upstash",
    async getJson<T>(key: string) {
      return (await redis.get<T>(key)) ?? null;
    },
    async setJson(key, value, ttlSeconds) {
      await redis.set(key, value, { ex: ttlSeconds });
    },
    async del(keys) {
      if (keys.length > 0) await redis.del(...keys);
    },
    async incrBy(key, by, ttlSeconds) {
      const pipeline = redis.pipeline();
      pipeline.incrby(key, by);
      pipeline.expire(key, ttlSeconds, "NX");
      const [value] = await pipeline.exec<[number, number]>();
      return value;
    },
    async getNumber(key) {
      return Number((await redis.get<number>(key)) ?? 0);
    },
  };
}

async function createRedisStore(url: string): Promise<CacheStore> {
  const { createClient } = await import("redis");
  const client = createClient({
    url,
    socket: { connectTimeout: 2_000, reconnectStrategy: (n) => Math.min(n * 200, 2_000) },
  });
  client.on("error", () => {
    // Connection errors surface on individual commands; avoid unhandled 'error' events.
  });
  await client.connect();
  return {
    kind: "redis",
    async getJson<T>(key: string) {
      const raw = await client.get(key);
      return raw === null ? null : (JSON.parse(raw) as T);
    },
    async setJson(key, value, ttlSeconds) {
      await client.set(key, JSON.stringify(value), { expiration: { type: "EX", value: ttlSeconds } });
    },
    async del(keys) {
      if (keys.length > 0) await client.del(keys);
    },
    async incrBy(key, by, ttlSeconds) {
      const [value] = await client.multi().incrBy(key, by).expire(key, ttlSeconds, "NX").exec();
      return Number(value);
    },
    async getNumber(key) {
      return Number((await client.get(key)) ?? 0);
    },
    async commandsProcessed() {
      const info = await client.info("stats");
      const match = /total_commands_processed:(\d+)/.exec(info);
      return match ? Number(match[1]) : null;
    },
  };
}

let storePromise: Promise<CacheStore> | undefined;

export function getCache(): Promise<CacheStore> {
  storePromise ??= (async () => {
    const env = getEnv();
    try {
      if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
        return await createUpstashStore(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);
      }
      if (env.REDIS_URL) return await createRedisStore(env.REDIS_URL);
    } catch (error) {
      console.warn(
        JSON.stringify({
          level: "warn",
          message: "cache unavailable, continuing without it",
          error: String(error),
        }),
      );
    }
    return new NoopStore();
  })();
  return storePromise;
}

/** For tests. */
export function setCacheForTesting(store: CacheStore | undefined) {
  storePromise = store ? Promise.resolve(store) : undefined;
}

export { NoopStore };

/** Read-through cache: returns the cached value or computes, stores and returns it. */
export async function cached<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
  const store = await getCache();
  try {
    const hit = await store.getJson<T>(key);
    if (hit !== null) return hit;
  } catch {
    // Cache read failures must never break the page.
  }
  const value = await compute();
  try {
    await store.setJson(key, value, ttlSeconds);
  } catch {
    // Ignore cache write failures.
  }
  return value;
}
