import { describe, expect, it } from "vitest";
import { cleanText, normalizeFieldName, parseDdMmYyyy, parsePrice } from "@/lib/datagovin";

describe("parseDdMmYyyy", () => {
  it("converts DD/MM/YYYY to ISO", () => {
    expect(parseDdMmYyyy("17/09/2026")).toBe("2026-09-17");
    expect(parseDdMmYyyy(" 1/2/2026 ")).toBe("2026-02-01");
    expect(parseDdMmYyyy("01-02-2026")).toBe("2026-02-01");
  });

  it("rejects impossible or ambiguous dates", () => {
    expect(parseDdMmYyyy("31/02/2026")).toBeNull();
    expect(parseDdMmYyyy("17/13/2026")).toBeNull();
    expect(parseDdMmYyyy("2026-09-17")).toBeNull();
    expect(parseDdMmYyyy("")).toBeNull();
    expect(parseDdMmYyyy(20260917)).toBeNull();
    expect(parseDdMmYyyy(undefined)).toBeNull();
  });
});

describe("parsePrice", () => {
  it("accepts numbers and numeric strings", () => {
    expect(parsePrice(4800)).toBe(4800);
    expect(parsePrice("4800")).toBe(4800);
    expect(parsePrice(" 4,800 ")).toBe(4800);
    expect(parsePrice("₹ 4800.00")).toBe(4800);
    expect(parsePrice("Rs. 1,25,000")).toBe(125000);
    expect(parsePrice(4800.6)).toBe(4801);
  });

  it("rejects zero, negatives, placeholders and junk", () => {
    for (const bad of [0, "0", -5, "-5", "", "NR", "-", "abc", "12a", NaN, Infinity, null, undefined, {}]) {
      expect(parsePrice(bad), String(bad)).toBeNull();
    }
  });
});

describe("cleanText", () => {
  it("trims and collapses whitespace", () => {
    expect(cleanText("  APMC   Mumbai ")).toBe("APMC Mumbai");
    expect(cleanText("   ")).toBeNull();
    expect(cleanText(null)).toBeNull();
    expect(cleanText(12)).toBe("12");
  });
});

describe("normalizeFieldName", () => {
  it("maps inconsistent names to one form", () => {
    expect(normalizeFieldName("Min_x0020_Price")).toBe("min_price");
    expect(normalizeFieldName("Arrival_Date")).toBe("arrival_date");
    expect(normalizeFieldName("modal_price")).toBe("modal_price");
    expect(normalizeFieldName("Modal Price ")).toBe("modal_price");
    expect(normalizeFieldName("STATE")).toBe("state");
    expect(normalizeFieldName("state.keyword")).toBe("state_keyword");
  });
});
