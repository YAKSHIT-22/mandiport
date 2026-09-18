import { NextResponse, type NextRequest } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getEnv } from "@/env";
import { generateLinkCode, sendMessage } from "@/lib/telegram/client";
import { getDb } from "@/lib/db";
import { alerts, telegramLinks } from "@/lib/db/schema";

/**
 * Telegram webhook (SPEC §8.9). Verified with the secret header Telegram echoes back.
 * /start issues a one-time code to link a chat on the website; /stop deletes the chat's alerts.
 */

const update = z.object({
  message: z
    .object({
      text: z.string().max(4096).optional(),
      chat: z.object({ id: z.union([z.number(), z.string()]) }),
    })
    .optional(),
});

const LINK_CODE_TTL_MINUTES = 30;

export async function POST(request: NextRequest) {
  const secret = getEnv().TELEGRAM_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const parsed = update.safeParse(await request.json().catch(() => ({})));
  // Always answer 200 so Telegram does not retry malformed updates forever.
  if (!parsed.success || !parsed.data.message) return NextResponse.json({ ok: true });

  const chatId = String(parsed.data.message.chat.id);
  const text = (parsed.data.message.text ?? "").trim().toLowerCase();
  const db = getDb();

  try {
    if (text.startsWith("/start")) {
      const code = generateLinkCode();
      await db.insert(telegramLinks).values({
        code,
        telegramChatId: chatId,
        expiresAt: new Date(Date.now() + LINK_CODE_TTL_MINUTES * 60_000),
      });
      await sendMessage(
        chatId,
        `Your Mandiport code is ${code}\n\nEnter it on ${getEnv().NEXT_PUBLIC_SITE_URL}/alerts within ${LINK_CODE_TTL_MINUTES} minutes to set up a price alert.\n\nSend /stop at any time to remove your alerts.`,
      );
    } else if (text.startsWith("/stop")) {
      const removed = await db
        .delete(alerts)
        .where(eq(alerts.telegramChatId, chatId))
        .returning({ id: alerts.id });
      await db.delete(telegramLinks).where(eq(telegramLinks.telegramChatId, chatId));
      await sendMessage(
        chatId,
        removed.length > 0
          ? `Removed ${removed.length} alert${removed.length === 1 ? "" : "s"}. Your chat ID has been deleted. Send /start to set up alerts again.`
          : "You have no alerts. Send /start if you would like to set one up.",
      );
    } else {
      await sendMessage(
        chatId,
        "Send /start to get a code for setting up price alerts, or /stop to remove your alerts.",
      );
    }
  } catch {
    // Never fail the webhook: Telegram would retry and the user would get duplicates.
  }
  // Housekeeping: drop expired, unused codes.
  await db
    .delete(telegramLinks)
    .where(and(sql`${telegramLinks.expiresAt} < now()`, sql`${telegramLinks.usedAt} is null`));
  return NextResponse.json({ ok: true });
}
