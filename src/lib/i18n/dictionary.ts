import "server-only";
import { lang } from "next/root-params";
import { en, type Dictionary } from "@/content/i18n/en";
import { hi } from "@/content/i18n/hi";
import { DEFAULT_LOCALE, toLocale, type Locale } from "./config";

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

/** Fills `{name}` placeholders: format(t.common.dataFrom, { date }). */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export type { Dictionary, Locale };
