/** Language selection (SPEC §15: Hindi alongside English). */

export const LOCALES = ["en", "hi"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Chosen in the header, remembered per device; the URL never changes. */
export const LOCALE_COOKIE = "mp-lang";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** The `lang` attribute: Indian English and Indian Hindi. */
export const HTML_LANG: Record<Locale, string> = { en: "en-IN", hi: "hi-IN" };

export const LOCALE_LABEL: Record<Locale, string> = { en: "English", hi: "हिन्दी" };

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "hi";
}

export function toLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
