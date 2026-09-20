"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { rateLimit } from "@/lib/cache/ratelimit";
import { getDb } from "@/lib/db";
import { alerts, telegramLinks } from "@/lib/db/schema";
import { clientIp } from "@/lib/request";
import { headers } from "next/headers";

const schema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6}$/, "Enter the 6-character code from the bot"),
  crop: z.string().regex(/^[a-z0-9-]{1,90}$/, "Choose a crop"),
  state: z
    .string()
    .regex(/^[a-z0-9-]{0,90}$/)
    .optional(),
  direction: z.enum(["above", "below"]),
  threshold: z.coerce.number().int().positive().max(10_000_000),
});

export type AlertState = {
  status: "idle" | "created" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

/** Links a Telegram chat by one-time code and stores the alert (SPEC §8.9). */
export async function createAlert(_prev: AlertState, formData: FormData): Promise<AlertState> {
  const h = await headers();
  const limit = await rateLimit("alerts", clientIp({ headers: h } as unknown as Request), [
    { limit: 10, windowSeconds: 600 },
  ]);
  if (!limit.ok) return { status: "error", message: "Too many attempts. Please wait a few minutes." };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { status: "error", message: "Please check the form.", fieldErrors };
  }
  const db = getDb();
  const [link] = await db
    .select()
    .from(telegramLinks)
    .where(
      and(
        eq(telegramLinks.code, parsed.data.code),
        isNull(telegramLinks.usedAt),
        sql`${telegramLinks.expiresAt} > now()`,
      ),
    );
  if (!link)
    return {
      status: "error",
      message: "That code is not valid or has expired. Send /start to the bot for a new one.",
    };

  const [crop] = await db
    .execute<{ id: number }>(sql`select id from commodities where slug = ${parsed.data.crop}`)
    .then((r) => r.rows);
  if (!crop) return { status: "error", message: "That crop was not found." };
  const stateRow = parsed.data.state
    ? (await db.execute<{ id: number }>(sql`select id from states where slug = ${parsed.data.state}`)).rows[0]
    : undefined;

  await db.insert(alerts).values({
    telegramChatId: link.telegramChatId,
    commodityId: crop.id,
    stateId: stateRow?.id ?? null,
    direction: parsed.data.direction,
    threshold: parsed.data.threshold,
    active: true,
  });
  await db.update(telegramLinks).set({ usedAt: new Date() }).where(eq(telegramLinks.code, link.code));
  return { status: "created" };
}
