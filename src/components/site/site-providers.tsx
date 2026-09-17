"use client";

import { ConsentProvider } from "./consent";

export function SiteProviders({
  children,
  needsConsent = false,
}: {
  children: React.ReactNode;
  needsConsent?: boolean;
}) {
  return <ConsentProvider needsConsent={needsConsent}>{children}</ConsentProvider>;
}
