"use client";

import { ConsentProvider, type ConsentLabels } from "./consent";
import { GoogleAnalytics } from "./google-analytics";

/** Consent gate and analytics. GA only loads after the visitor accepts (SPEC §10.1). */
export function SiteProviders({
  children,
  needsConsent,
  labels,
}: {
  children: React.ReactNode;
  needsConsent: boolean;
  labels: ConsentLabels;
}) {
  return (
    <ConsentProvider needsConsent={needsConsent} labels={labels}>
      {children}
      {needsConsent && <GoogleAnalytics />}
    </ConsentProvider>
  );
}
