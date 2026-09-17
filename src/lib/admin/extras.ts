import { getEnv } from "@/env";
import { todayInIst } from "@/lib/dates";
import { getCache } from "@/lib/cache/store";
import { keys } from "@/lib/cache/keys";

/** Service status lines for the admin overview: cache, AI token use, integrations. */
export async function getAdminExtras(): Promise<{ label: string; value: string }[]> {
  const env = getEnv();
  const store = await getCache();
  const lines: { label: string; value: string }[] = [];

  if (store.kind === "upstash") {
    lines.push({
      label: "Cache",
      value: "Upstash Redis (command usage: see the Upstash console; free tier 500,000/month)",
    });
  } else if (store.kind === "redis") {
    const commands = await store.commandsProcessed?.().catch(() => null);
    lines.push({
      label: "Cache",
      value: `Local Redis, ${commands ?? "?"} commands processed since server start`,
    });
  } else {
    lines.push({ label: "Cache", value: "Not configured (no caching; rate limits are per server instance)" });
  }

  const today = todayInIst().replaceAll("-", "");
  const tokens = await store.getNumber(keys.aiTokens(today)).catch(() => 0);
  lines.push({
    label: "AI tokens today",
    value: `${tokens.toLocaleString("en-IN")} of ${env.AI_DAILY_TOKEN_CAP.toLocaleString("en-IN")}`,
  });
  lines.push({
    label: "AI gateway",
    value: env.AI_GATEWAY_API_KEY && env.AI_MODEL_ID ? `configured (${env.AI_MODEL_ID})` : "not configured",
  });
  lines.push({ label: "Ola Maps", value: env.OLA_MAPS_API_KEY ? "configured" : "not configured" });
  lines.push({ label: "Telegram bot", value: env.TELEGRAM_BOT_TOKEN ? "configured" : "not configured" });
  lines.push({ label: "Ads", value: env.NEXT_PUBLIC_ADS_ENABLED ? "enabled" : "disabled" });
  return lines;
}
