import { describe, expect, it } from "vitest";
import exportList from "../../data/export-commodities.json";
import { suggestExportMappings, tokenSimilarity } from "@/lib/mappings/suggest";
import { displayName, slugify, uniqueSlug } from "@/lib/slug";

const exportsAvailable = exportList.commodities.map((c) => ({ key: c.key, displayName: c.displayName }));

describe("export mapping suggestions", () => {
  it("uses curated synonyms first, most specific key highest", () => {
    const s = suggestExportMappings(
      { sourceName: "Cummin Seed(Jeera)", categorySlug: "spices" },
      exportsAvailable,
    );
    expect(s[0]).toMatchObject({ exportKey: "SPICES", confidence: 0.9 });
  });

  it("matches by name when names agree", () => {
    const s = suggestExportMappings({ sourceName: "Wheat", categorySlug: "cereals" }, exportsAvailable);
    expect(s[0]?.exportKey).toBe("WHEAT");
  });

  it("falls back to the category group with low confidence", () => {
    const s = suggestExportMappings(
      { sourceName: "Knool Khol", categorySlug: "vegetables" },
      exportsAvailable,
    );
    expect(s).toEqual([
      { exportKey: "FRESH VEGETABLES", confidence: 0.35, reason: "category fallback (vegetables)" },
    ]);
  });

  it("suggests nothing when there is no plausible export counterpart", () => {
    expect(
      suggestExportMappings({ sourceName: "Firewood", categorySlug: "others" }, exportsAvailable),
    ).toEqual([]);
  });

  it("scores token overlap", () => {
    expect(tokenSimilarity("Sesame seeds", "SESAME SEEDS")).toBe(1);
    expect(tokenSimilarity("Onion", "Tea")).toBe(0);
  });
});

describe("slugs and display names", () => {
  it("makes clean lowercase hyphenated slugs", () => {
    expect(slugify("Bengal Gram(Gram)(Whole)")).toBe("bengal-gram-gram-whole");
    expect(slugify("  Rose(Loose)) ")).toBe("rose-loose");
    expect(slugify("Pea Pod/Pea Cod/हरी मटर")).toBe("pea-pod-pea-cod");
    expect(slugify("हरी मटर")).toBe("item");
  });

  it("de-duplicates slugs", () => {
    const taken = new Set<string>();
    expect(uniqueSlug("Rose(Loose)", taken)).toBe("rose-loose");
    expect(uniqueSlug("Rose(Loose))", taken)).toBe("rose-loose-2");
  });

  it("tidies display names without changing words", () => {
    expect(displayName("Rose(Loose))")).toBe("Rose (Loose)");
    expect(displayName("Bengal Gram(Gram)(Whole)")).toBe("Bengal Gram (Gram) (Whole)");
    expect(displayName("nigella seeds")).toBe("Nigella seeds");
  });
});
