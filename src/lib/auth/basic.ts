import { timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Checks an HTTP Basic Authorization header against ADMIN_USERNAME / ADMIN_PASSWORD.
 * Fails closed when credentials are not configured.
 */
export function isAdminAuthorized(
  authorization: string | null,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const username = env.ADMIN_USERNAME;
  const password = env.ADMIN_PASSWORD;
  if (!username || !password || !authorization?.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8");
  } catch {
    return false;
  }
  const separator = decoded.indexOf(":");
  if (separator < 0) return false;
  // Evaluate both comparisons to avoid leaking which part was wrong.
  const userOk = safeEqual(decoded.slice(0, separator), username);
  const passOk = safeEqual(decoded.slice(separator + 1), password);
  return userOk && passOk;
}

/** Checks `Authorization: Bearer ${CRON_SECRET}` (SPEC §6.7). Fails closed when unset. */
export function isCronAuthorized(
  authorization: string | null,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const secret = env.CRON_SECRET;
  if (!secret || !authorization?.startsWith("Bearer ")) return false;
  return safeEqual(authorization.slice(7), secret);
}
