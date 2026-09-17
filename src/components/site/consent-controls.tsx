"use client";

import { useConsent } from "./consent";

export function ConsentControls() {
  const { consent, ready, decide } = useConsent();
  if (!ready) return null;
  return (
    <div className="border-border bg-muted flex flex-wrap items-center gap-2 border-l-4 px-4 py-3">
      <p className="w-full">
        Analytics is currently{" "}
        <strong>
          {consent === "accepted" ? "allowed" : consent === "declined" ? "declined" : "not decided"}
        </strong>
        .
      </p>
      <button
        type="button"
        onClick={() => decide("accepted")}
        className="bg-panel text-panel-foreground min-h-11 rounded-sm px-4 font-semibold"
      >
        Allow analytics
      </button>
      <button
        type="button"
        onClick={() => decide("declined")}
        className="border-input min-h-11 rounded-sm border px-4 font-semibold"
      >
        Decline analytics
      </button>
    </div>
  );
}
