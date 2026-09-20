import { describe, expect, it } from "vitest";
import { CROP_NAMES_HI } from "@/content/i18n/crop-names-hi";
import { en } from "@/content/i18n/en";
import { hi } from "@/content/i18n/hi";
import { isLocale, toLocale } from "@/lib/i18n/config";
import { format } from "@/lib/i18n/format";
import { cropName, categoryName } from "@/lib/i18n/names";
import { formatDataDate, describeDataDate } from "@/lib/dates";

/** The two dictionaries must stay the same shape, or a page renders "undefined" in one language. */
function paths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => paths(child, prefix ? `${prefix}.${key}` : key));
}

describe("dictionaries", () => {
  it("have exactly the same keys", () => {
    expect(paths(hi).sort()).toEqual(paths(en).sort());
  });

  it("have no empty strings", () => {
    const empties = (dict: unknown, prefix = ""): string[] =>
      typeof dict === "string"
        ? dict.trim() === ""
          ? [prefix]
          : []
        : typeof dict === "object" && dict !== null
          ? Object.entries(dict).flatMap(([k, v]) => empties(v, prefix ? `${prefix}.${k}` : k))
          : [];
    expect(empties(en)).toEqual([]);
    expect(empties(hi)).toEqual([]);
  });

  it("keeps every placeholder a template needs in both languages", () => {
    const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    const walk = (a: unknown, b: unknown, prefix = ""): void => {
      if (typeof a === "string" && typeof b === "string") {
        expect(placeholders(b), `placeholders differ at ${prefix}`).toEqual(placeholders(a));
        return;
      }
      if (typeof a === "object" && a !== null && typeof b === "object" && b !== null) {
        for (const key of Object.keys(a)) {
          walk((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], `${prefix}.${key}`);
        }
      }
    };
    walk(en, hi);
  });

  it("writes Hindi text in Devanagari, apart from names the source publishes in English", () => {
    expect(hi.nav.crops).toMatch(/[ऀ-ॿ]/);
    expect(hi.home.titleLead).toMatch(/[ऀ-ॿ]/);
    // Dataset and licence names stay as data.gov.in publishes them.
    expect(hi.footer.licenceName).toBe(en.footer.licenceName);
  });
});

describe("locale helpers", () => {
  it("accepts only the locales we ship", () => {
    expect(isLocale("hi")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(toLocale("fr")).toBe("en");
    expect(toLocale(undefined)).toBe("en");
  });

  it("fills placeholders and leaves unknown ones alone", () => {
    expect(format("{a} and {b}", { a: "1", b: 2 })).toBe("1 and 2");
    expect(format("{missing}", {})).toBe("{missing}");
  });

  it("formats dates in the reader's language", () => {
    expect(formatDataDate("2026-09-17")).toBe("17 Sep 2026");
    expect(formatDataDate("2026-09-17", "hi")).toBe("17 सित 2026");
    expect(describeDataDate("2026-09-17", new Date("2026-09-17T06:00:00Z"), "hi")).toBe("आज");
  });
});

describe("crop and category names", () => {
  it("uses the Hindi name when we have one", () => {
    expect(cropName("onion", "Onion", "hi")).toBe("प्याज");
    expect(categoryName("vegetables", "Vegetables", "hi")).toBe("सब्ज़ियाँ");
  });

  it("falls back to the published English name rather than inventing one", () => {
    expect(cropName("alsandikai", "Alsandikai", "hi")).toBe("Alsandikai");
    expect(cropName("onion", "Onion", "en")).toBe("Onion");
    expect(categoryName("unknown", "Unknown", "hi")).toBe("Unknown");
  });

  it("has no blank Hindi crop names", () => {
    for (const [slug, name] of Object.entries(CROP_NAMES_HI)) {
      expect(name.trim(), slug).not.toBe("");
      expect(name, slug).toMatch(/[ऀ-ॿ]/);
    }
  });
});
