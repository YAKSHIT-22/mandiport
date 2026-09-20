import "server-only";
import { lang } from "next/root-params";
import { en, type Dictionary } from "@/content/i18n/en";
import { hi } from "@/content/i18n/hi";
import { DEFAULT_LOCALE, toLocale, type Locale } from "./config";
import { format } from "./format";

const DICTIONARIES: Record<Locale, Dictionary> = { en, hi };

/**
 * The current request's language, read from the `[lang]` root segment. The proxy sets that
 * segment from the reader's cookie, so the public URL never changes (DECISIONS D-025).
 */
export async function getLocale(): Promise<Locale> {
  try {
    return toLocale(await lang());
  } catch {
    // Outside a request (scripts, tests): English.
    return DEFAULT_LOCALE;
  }
}

export async function getDict(): Promise<Dictionary> {
  return DICTIONARIES[await getLocale()];
}

/** Dictionary for a known locale, for route handlers and client component props. */
export function dictionaryFor(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export { format };
export type { Dictionary, Locale };
