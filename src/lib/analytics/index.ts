/**
 * Typed GA4 event helper (SPEC §10.1). Sends nothing unless GA has loaded after consent.
 * Params never carry personal data: only crop/tool identifiers and counts.
 */

export interface AnalyticsEvents {
  crop_hub_view: { crop: string };
  tool_used: { tool: string; crop?: string; state?: string };
  best_mandi_result: { crop: string; results_count: number; max_distance_km: number };
  ask_question: { answered: boolean; tools_called_count: number };
  ask_refused: { reason: string };
  alert_created: { crop: string; direction: "above" | "below" };
  brief_view: { crop: string; week: string };
  chart_period_change: { crop: string; days: number };
  source_link_click: { dataset: string };
}

export type AnalyticsEvent = keyof AnalyticsEvents;

type Gtag = (command: "event", name: string, params: Record<string, unknown>) => void;

export function track<E extends AnalyticsEvent>(event: E, params: AnalyticsEvents[E]): void {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag !== "function") return;
  try {
    gtag("event", event, params as Record<string, unknown>);
  } catch {
    // Analytics must never break the page.
  }
}
