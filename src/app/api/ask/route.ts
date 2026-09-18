import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/cache/ratelimit";
import { ask } from "@/lib/ai/ask";
import { clientIp } from "@/lib/request";

const input = z.object({ question: z.string().trim().min(5).max(300) });

/** Ask Mandiport (SPEC §8.7): 5 questions a minute and 30 a day per IP. */
export async function POST(request: NextRequest) {
  const limit = await rateLimit("ask", clientIp(request), [
    { limit: 5, windowSeconds: 60 },
    { limit: 30, windowSeconds: 86_400 },
  ]);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "You have asked several questions just now. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }
  const parsed = input.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please write a question of at least 5 characters." }, { status: 400 });
  }
  const result = await ask({ question: parsed.data.question });
  return NextResponse.json(result);
}
