import { keys } from "./keys";
import { getCache } from "./store";

export interface RateWindow {
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the tightest exceeded window resets (approximate). */
  retryAfter: number;
}

/**
 * Fixed-window rate limiting on the cache store (DECISIONS D-014). Each window costs one
 * pipelined INCR+EXPIRE. Fails open if the cache is unreachable, so an outage never blocks users.
 */
export async function rateLimit(
  name: string,
  id: string,
  windows: RateWindow[],
  now = Date.now(),
): Promise<RateLimitResult> {
  try {
    const store = await getCache();
    let retryAfter = 0;
    let ok = true;
    for (const w of windows) {
      const bucket = Math.floor(now / 1000 / w.windowSeconds);
      const count = await store.incrBy(
        keys.rateLimit(name, id, bucket * w.windowSeconds),
        1,
        w.windowSeconds,
      );
      if (count > w.limit) {
        ok = false;
        retryAfter = Math.max(retryAfter, (bucket + 1) * w.windowSeconds - Math.floor(now / 1000));
      }
    }
    return { ok, retryAfter };
  } catch {
    return { ok: true, retryAfter: 0 };
  }
}
