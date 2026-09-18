import { z } from "zod";
import { getEnv } from "@/env";

/** Telegram Bot API client (SPEC §8.9). Only chat IDs are ever stored. */

export class TelegramNotConfiguredError extends Error {
  override name = "TelegramNotConfiguredError";
}

const sendResponse = z.object({ ok: z.boolean(), description: z.string().optional() });

async function callApi(method: string, body: Record<string, unknown>): Promise<void> {
  const token = getEnv().TELEGRAM_BOT_TOKEN;
  if (!token) throw new TelegramNotConfiguredError("TELEGRAM_BOT_TOKEN is not set");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const parsed = sendResponse.safeParse(await response.json().catch(() => ({ ok: false })));
  if (!response.ok || !parsed.success || !parsed.data.ok) {
    throw new Error(
      `Telegram ${method} failed: ${parsed.success ? parsed.data.description : response.status}`,
    );
  }
}

export async function sendMessage(chatId: string, text: string): Promise<void> {
  await callApi("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true });
}

/** Points Telegram at our webhook and sets the secret header it must send back. */
export async function setWebhook(url: string, secret: string): Promise<void> {
  await callApi("setWebhook", { url, secret_token: secret, allowed_updates: ["message"] });
}

/** Six characters, no ambiguous letters, easy to read aloud and type. */
export function generateLinkCode(random = () => Math.random()): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(random() * alphabet.length)]).join("");
}
