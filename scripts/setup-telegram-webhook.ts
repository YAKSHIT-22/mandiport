/** Registers the Telegram webhook (SPEC §8.9). Run once per deployment URL change. */
import { getEnv, requireEnv } from "@/env";
import { setWebhook } from "@/lib/telegram/client";
import { logger, runScript } from "./lib/context";

runScript("setup-telegram-webhook", async () => {
  const url = `${requireEnv("NEXT_PUBLIC_SITE_URL", getEnv())}/api/telegram/webhook`;
  await setWebhook(url, requireEnv("TELEGRAM_WEBHOOK_SECRET"));
  logger.info("webhook registered", { url });
});
