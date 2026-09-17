"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";
import { useConsent } from "./consent";

export function AdUnit({ client }: { client: string }) {
  const { consent } = useConsent();
  const pushed = useRef(false);
  const allowed = consent === "accepted";

  useEffect(() => {
    if (!allowed || pushed.current) return;
    pushed.current = true;
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      (w.adsbygoogle = w.adsbygoogle || []).push({});
    } catch {
      // Ad blockers must never break the page.
    }
  }, [allowed]);

  if (!allowed) return <div className="bg-muted min-h-[250px]" />;
  return (
    <>
      <Script
        id="adsbygoogle-js"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
        strategy="afterInteractive"
        crossOrigin="anonymous"
      />
      <ins
        className="adsbygoogle block min-h-[250px]"
        data-ad-client={client}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </>
  );
}
