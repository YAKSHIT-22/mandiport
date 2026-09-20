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

describe("written content", () => {
  it("has a Hindi overview for every category, with the same number of paragraphs", async () => {
    const { CATEGORY_OVERVIEWS } = await import("@/content/categories");
    const { CATEGORY_OVERVIEWS_HI } = await import("@/content/categories-hi");
    expect(Object.keys(CATEGORY_OVERVIEWS_HI).sort()).toEqual(Object.keys(CATEGORY_OVERVIEWS).sort());
    for (const [slug, overview] of Object.entries(CATEGORY_OVERVIEWS)) {
      expect(CATEGORY_OVERVIEWS_HI[slug]!.intro, slug).toHaveLength(overview.intro.length);
      for (const paragraph of CATEGORY_OVERVIEWS_HI[slug]!.intro) {
        expect(paragraph, slug).toMatch(/[ऀ-ॿ]/);
      }
    }
  });
});

describe("crop guides", () => {
  it("keeps the Hindi guides the same shape as the English ones", async () => {
    const { CROP_GUIDES } = await import("@/content/crop-guides");
    const { CROP_GUIDES_HI } = await import("@/content/crop-guides-hi");
    for (const [slug, hindi] of Object.entries(CROP_GUIDES_HI)) {
      const english = CROP_GUIDES.find((g) => g.slug === slug);
      expect(english, `${slug} has a Hindi guide but no English one`).toBeDefined();
      for (const section of ["intro", "seasons", "varieties", "selling"] as const) {
        expect(hindi[section].length, `${slug}.${section}`).toBe(english![section].length);
        for (const paragraph of hindi[section]) {
          expect(paragraph, `${slug}.${section}`).toMatch(/[ऀ-ॿ]/);
        }
      }
    }
  });

  it("has a Hindi title for every general guide", async () => {
    const { GUIDES } = await import("@/content/guides");
    const { GENERAL_GUIDES_HI } = await import("@/content/guides-hi");
    for (const guide of GUIDES.filter((g) => !g.crop)) {
      expect(GENERAL_GUIDES_HI[guide.slug], guide.slug).toBeDefined();
    }
  });
});
