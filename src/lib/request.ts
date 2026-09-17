import type { NextRequest } from "next/server";

/** Best-effort client IP for rate limiting (Vercel sets x-forwarded-for). Never stored. */
export function clientIp(request: NextRequest | Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
