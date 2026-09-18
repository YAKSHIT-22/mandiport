"use client";

import { ConsentProvider } from "./consent";
import { GoogleAnalytics } from "./google-analytics";

/** Consent gate and analytics. GA only loads after the visitor accepts (SPEC §10.1). */
export function SiteProviders({
  children,
  needsConsent,
}: {
  children: React.ReactNode;
  needsConsent: boolean;
}) {
  return (
    <ConsentProvider needsConsent={needsConsent}>
      {children}
      {needsConsent && <GoogleAnalytics />}
    </ConsentProvider>
  );
}
