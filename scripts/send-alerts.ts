/** Sends Telegram price alerts after ingestion (SPEC §8.9). Safe to run when nothing matches. */
import { getEnv } from "@/env";
import { alertMessage, findTriggeredAlerts, markAlertSent } from "@/lib/alerts/check";
import { todayInIst } from "@/lib/dates";
import { sendMessage, TelegramNotConfiguredError } from "@/lib/telegram/client";
import { logger, runScript } from "./lib/context";

runScript("send-alerts", async ({ db, env }) => {
  if (!env.TELEGRAM_BOT_TOKEN) {
    logger.info("telegram not configured; skipping alerts");
    return;
  }
  const today = todayInIst();
  const triggered = await findTriggeredAlerts(db, today);
  let sent = 0;
  for (const alert of triggered) {
    try {
      await sendMessage(alert.chatId, alertMessage(alert, getEnv().NEXT_PUBLIC_SITE_URL));
      await markAlertSent(db, alert.id, today);
      sent++;
    } catch (error) {
      if (error instanceof TelegramNotConfiguredError) break;
      // A blocked bot or deleted chat must not stop the rest.
      logger.warn("alert delivery failed", {
        alertId: alert.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  logger.info("alerts finished", { triggered: triggered.length, sent });
});
