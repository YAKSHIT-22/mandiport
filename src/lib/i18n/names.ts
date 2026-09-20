import { CROP_NAMES_HI } from "@/content/i18n/crop-names-hi";
import type { Locale } from "./config";

/**
 * Crop and category names in the reader's language.
 *
 * Names come from Agmarknet in English. Where a crop has a settled everyday Hindi name we show
 * it (`crop-names-hi.ts`); otherwise the English name stands, because a guessed translation
 * would be worse than the name the trader already recognises. Market, district and state names
 * are proper nouns from the dataset and are never translated.
 */
export function cropName(slug: string, english: string, locale: Locale): string {
  if (locale !== "hi") return english;
  return CROP_NAMES_HI[slug] ?? english;
}

/** Hindi for the eleven crop categories we seed. */
const CATEGORY_NAMES_HI: Record<string, string> = {
  vegetables: "सब्ज़ियाँ",
  fruits: "फल",
  cereals: "अनाज",
  pulses: "दालें",
  spices: "मसाले",
  oilseeds: "तिलहन",
  fibres: "रेशे",
  flowers: "फूल",
  "dry-fruits": "सूखे मेवे",
  "livestock-poultry": "पशु और मुर्गी",
  others: "अन्य",
};

export function categoryName(slug: string, english: string, locale: Locale): string {
  if (locale !== "hi") return english;
  return CATEGORY_NAMES_HI[slug] ?? english;
}
