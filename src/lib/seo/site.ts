import { getEnv } from "@/env";

export const SITE_NAME = "Mandiport";
export const SITE_TAGLINE = "Mandi prices and export demand, crop by crop";
export const SITE_DESCRIPTION =
  "Daily mandi prices, price history, best mandi to sell and export destinations for Indian crops, from official Government of India data.";

export function siteUrl(path = "/"): string {
  const base = getEnv().NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  return `${base}${path === "/" ? "" : path.startsWith("/") ? path : `/${path}`}` || base;
}
