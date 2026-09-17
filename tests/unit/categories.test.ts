import { describe, expect, it } from "vitest";
import rulesFile from "../../data/category-rules.json";
import synonyms from "../../data/commodity-synonyms.json";
import names from "../fixtures/names/commodities.json";
import { categories, compileCategoryRules, suggestCategory } from "@/lib/categories";

const slugs = new Set(categories.map((c) => c.slug));

describe("category rules file", () => {
  it("seeds the 11 categories from SPEC §6.5", () => {
    expect(categories.map((c) => c.slug)).toEqual([
      "vegetables",
      "fruits",
      "cereals",
      "pulses",
      "spices",
      "oilseeds",
      "fibres",
      "flowers",
      "dry-fruits",
      "livestock-poultry",
      "others",
    ]);
  });

  it("only points at known categories", () => {
    for (const slug of Object.values(rulesFile.exact)) expect(slugs).toContain(slug);
    for (const rule of rulesFile.rules) expect(slugs).toContain(rule.category);
  });
});

describe("suggestCategory", () => {
  it.each([
    ["Onion", "vegetables"],
    ["Wheat", "cereals"],
    ["Cummin Seed(Jeera)", "spices"],
    ["Bengal Gram(Gram)(Whole)", "pulses"],
    ["Sesamum(Sesame,Gingelly,Til)", "oilseeds"],
    ["Cotton", "fibres"],
    ["Cotton Seed", "oilseeds"],
    ["Marigold(Calcutta)", "flowers"],
    ["Almond(Badam)", "dry-fruits"],
    ["She Buffalo", "livestock-poultry"],
    ["Firewood", "others"],
    ["Banana", "fruits"],
    ["Banana - Green", "vegetables"],
    ["Green Chilli", "vegetables"],
    ["Dry Chillies", "spices"],
    // Whole-word matching: "cow" must not match Cowpea, "tur" must not match Turnip.
    ["Cowpea(Lobia/Karamani)", "pulses"],
    ["Turnip", "vegetables"],
    ["Pear(Marasebu)", "fruits"],
    ["Peas(Dry)", "pulses"],
  ])("%s → %s", (name, expected) => {
    expect(suggestCategory(name)).toBe(expected);
  });

  it("returns null for names it cannot place, leaving them to a human", () => {
    expect(suggestCategory("BOP")).toBeNull();
    expect(suggestCategory("")).toBeNull();
  });

  it("is case- and whitespace-insensitive", () => {
    expect(suggestCategory("  onion  ")).toBe("vegetables");
    expect(suggestCategory("NIGELLA SEEDS")).toBe("spices");
  });

  it("places at least 95% of real commodity names", () => {
    const all = names.commodities.map((c) => c.name);
    const placed = all.filter((n) => suggestCategory(n) !== null);
    expect(placed.length / all.length).toBeGreaterThanOrEqual(0.95);
  });

  it("gives exact overrides priority over keyword rules", () => {
    const suggest = compileCategoryRules({
      exact: { "Coconut Oil": "oilseeds" },
      rules: [{ category: "fruits", keywords: ["coconut"] }],
    });
    expect(suggest("Coconut Oil")).toBe("oilseeds");
    expect(suggest("Tender Coconut")).toBe("fruits");
  });
});

describe("commodity synonyms file", () => {
  const realNames = new Set(names.commodities.map((c) => c.name));

  it("uses unique keys, lowercase aliases and real mandi names", () => {
    const keys = synonyms.groups.map((g) => g.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const group of synonyms.groups) {
      for (const alias of group.aliases) expect(alias).toBe(alias.toLowerCase());
      for (const name of group.mandiNames) expect(realNames, name).toContain(name);
    }
  });
});
