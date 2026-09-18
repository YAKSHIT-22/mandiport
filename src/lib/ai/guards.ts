import { keys, TTL } from "@/lib/cache/keys";
import { getCache } from "@/lib/cache/store";
import { getEnv } from "@/env";
import { todayInIst } from "@/lib/dates";

/** Daily AI token budget and question normalization (SPEC §3, §8.7). */

export function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[?.!,;:'"]+$/g, "")
    .trim();
}

export async function tokensUsedToday(now = new Date()): Promise<number> {
  const cache = await getCache();
  return cache.getNumber(keys.aiTokens(todayInIst(now).replaceAll("-", ""))).catch(() => 0);
}

export async function isUnderTokenCap(now = new Date()): Promise<boolean> {
  return (await tokensUsedToday(now)) < getEnv().AI_DAILY_TOKEN_CAP;
}

export async function recordTokens(tokens: number, now = new Date()): Promise<number> {
  if (tokens <= 0) return tokensUsedToday(now);
  const cache = await getCache();
  return cache
    .incrBy(keys.aiTokens(todayInIst(now).replaceAll("-", "")), tokens, TTL.aiTokens)
    .catch(() => 0);
}

export const TOKEN_CAP_MESSAGE =
  "Mandiport's daily allowance for AI answers has been used up. The rest of the site still works, and answers are back tomorrow.";
