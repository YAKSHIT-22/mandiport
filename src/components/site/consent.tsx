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

export function ConsentProvider({
  children,
  needsConsent,
}: {
  children: React.ReactNode;
  needsConsent: boolean;
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
      {needsConsent && ready && consent === "unknown" && <ConsentBanner onDecide={decide} />}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  return useContext(ConsentContext);
}

function ConsentBanner({ onDecide }: { onDecide: (value: "accepted" | "declined") => void }) {
  return (
    <div
      role="region"
      aria-label="Analytics consent"
      className="border-input bg-background fixed inset-x-2 bottom-2 z-40 mx-auto max-w-2xl rounded-sm border p-4"
    >
      <p>
        We would like to use Google Analytics to count visits and see which tools help. No personal details
        are sent. You can change your choice on the{" "}
        <Link href="/privacy" className="underline">
          privacy page
        </Link>
        .
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onDecide("accepted")}
          className="bg-panel text-panel-foreground min-h-11 rounded-sm px-4 font-semibold"
        >
          Accept analytics
        </button>
        <button
          type="button"
          onClick={() => onDecide("declined")}
          className="border-input min-h-11 rounded-sm border px-4 font-semibold"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
