"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Analytics consent (SPEC §10.1): GA loads only after "Accept"; the choice is remembered in a
 * first-party cookie for 180 days. Declining stores the refusal so we do not ask again.
 */

export type ConsentState = "unknown" | "accepted" | "declined";
const COOKIE = "mp_consent";

type Ctx = {
  consent: ConsentState;
  ready: boolean;
  decide: (value: "accepted" | "declined") => void;
  reset: () => void;
};
const ConsentContext = createContext<Ctx>({
  consent: "unknown",
  ready: false,
  decide: () => {},
  reset: () => {},
});

export function readConsentCookie(cookie: string): ConsentState {
  const match = cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`));
  const value = match?.slice(COOKIE.length + 1);
  return value === "accepted" || value === "declined" ? value : "unknown";
}

export interface ConsentLabels {
  title: string;
  body: string;
  bodyLink: string;
  accept: string;
  decline: string;
}

export function ConsentProvider({
  children,
  needsConsent,
  labels,
}: {
  children: React.ReactNode;
  needsConsent: boolean;
  labels: ConsentLabels;
}) {
  const [consent, setConsent] = useState<ConsentState>("unknown");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Reading a browser-only cookie after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(readConsentCookie(document.cookie));
    setReady(true);
  }, []);

  const decide = useCallback((value: "accepted" | "declined") => {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${COOKIE}=${value}; Path=/; Max-Age=${60 * 60 * 24 * 180}; SameSite=Lax${secure}`;
    setConsent(value);
  }, []);

  const reset = useCallback(() => {
    document.cookie = `${COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    setConsent("unknown");
  }, []);

  const value = useMemo(() => ({ consent, ready, decide, reset }), [consent, ready, decide, reset]);
  return (
    <ConsentContext.Provider value={value}>
      {children}
      {needsConsent && ready && consent === "unknown" && <ConsentBanner onDecide={decide} labels={labels} />}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  return useContext(ConsentContext);
}

function ConsentBanner({
  onDecide,
  labels,
}: {
  onDecide: (value: "accepted" | "declined") => void;
  labels: ConsentLabels;
}) {
  return (
    <div
      role="region"
      aria-label={labels.title}
      className="border-input bg-background fixed inset-x-2 bottom-2 z-40 mx-auto max-w-2xl rounded-sm border p-4"
    >
      <p>
        {labels.body}{" "}
        <Link href="/privacy" className="underline">
          {labels.bodyLink}
        </Link>
        .
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onDecide("accepted")}
          className="bg-panel text-panel-foreground min-h-11 rounded-sm px-4 font-semibold"
        >
          {labels.accept}
        </button>
        <button
          type="button"
          onClick={() => onDecide("declined")}
          className="border-input min-h-11 rounded-sm border px-4 font-semibold"
        >
          {labels.decline}
        </button>
      </div>
    </div>
  );
}
