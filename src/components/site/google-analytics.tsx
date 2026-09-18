"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useConsent } from "./consent";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/** Admin pages are never measured. */
const EXCLUDED = /^\/admin(\/|$)/;

/**
 * GA4 via gtag.js, loaded only after the visitor accepts analytics (SPEC §10.1).
 * No personal data is sent: page_location is stripped to origin + path, and Google signals
 * (ads personalisation) stay off.
 */
export function GoogleAnalytics() {
  const { consent } = useConsent();
  const pathname = usePathname();
  const firstRender = useRef(true);
  const enabled = consent === "accepted" && Boolean(GA_ID);

  useEffect(() => {
    if (!enabled || !pathname || EXCLUDED.test(pathname)) return;
    if (firstRender.current) {
      // gtag('config') sends the first page view itself.
      firstRender.current = false;
      return;
    }
    const w = window as unknown as { gtag?: (...args: unknown[]) => void };
    w.gtag?.("event", "page_view", {
      page_location: `${location.origin}${pathname}`,
      page_path: pathname,
      page_title: document.title,
    });
  }, [enabled, pathname]);

  if (!enabled) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="mp-ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
gtag('js', new Date());
gtag('config', '${GA_ID}', { send_page_view: ${!EXCLUDED.test("/")}, page_location: location.origin + location.pathname, allow_google_signals: false });`}
      </Script>
    </>
  );
}
