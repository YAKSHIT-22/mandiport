import { getEnv } from "@/env";
import { AdUnit } from "./ad-unit";

export type AdPosition = "hub-header" | "guide-mid" | "brief-end";

/**
 * AdSense-ready slot (SPEC §10.3). Renders nothing, and reserves no space, unless
 * NEXT_PUBLIC_ADS_ENABLED=true and a client ID is set. Never placed inside tool inputs or results.
 * Hobby hosting is non-commercial: upgrade to Vercel Pro before enabling.
 */
export function AdSlot({ position }: { position: AdPosition }) {
  const env = getEnv();
  if (!env.NEXT_PUBLIC_ADS_ENABLED || !env.NEXT_PUBLIC_ADSENSE_CLIENT_ID) return null;
  return (
    <aside aria-label="Advertisement" className="min-h-[280px]" data-ad-position={position}>
      <p className="text-muted-foreground mb-1 text-center text-sm">Advertisement</p>
      <AdUnit client={env.NEXT_PUBLIC_ADSENSE_CLIENT_ID} />
    </aside>
  );
}
