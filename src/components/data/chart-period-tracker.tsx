"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/** Sends chart_period_change when a period radio changes. Renders nothing. */
export function ChartPeriodTracker({ chartId, crop }: { chartId: string; crop: string }) {
  useEffect(() => {
    const root = document.querySelector(`[data-chart="${CSS.escape(chartId)}"]`);
    if (!root) return;
    const onChange = (event: Event) => {
      const input = event.target as HTMLInputElement;
      if (input.dataset.periodInput) track("chart_period_change", { crop, days: Number(input.value) });
    };
    root.addEventListener("change", onChange);
    return () => root.removeEventListener("change", onChange);
  }, [chartId, crop]);
  return null;
}
