import { describe, expect, it } from "vitest";
import { rankMandis, type MandiCandidate } from "@/lib/tools/best-mandi";
import { haversineKm } from "@/lib/maps/ola";
import { chunkForTranslation } from "@/lib/ai/sarvam";

const market = (
  overrides: Partial<MandiCandidate> & { marketId: number; modalPrice: number },
): MandiCandidate => ({
  marketName: `Market ${overrides.marketId}`,
  district: "District",
  stateName: "Maharashtra",
  stateSlug: "maharashtra",
  marketSlug: `market-${overrides.marketId}`,
  cropSlug: "onion",
  date: "2026-09-16",
  lat: null,
  lng: null,
  ...overrides,
});

const input = { quantityQuintals: 20, transportRatePerKmPerQuintal: 3, maxDistanceKm: 150 };

describe("best mandi ranking", () => {
  it("subtracts transport from gross value", () => {
    const [first] = rankMandis([{ ...market({ marketId: 1, modalPrice: 2500 }), distanceKm: 40 }], input);
    // 2500 × 20 = 50,000 gross; 40 km × ₹3 × 20 qtl = 2,400 transport.
    expect(first).toMatchObject({ grossValue: 50_000, transportCost: 2_400, netValue: 47_600 });
  });

  it("prefers a nearer market when the far one loses more to transport", () => {
    const ranked = rankMandis(
      [
        { ...market({ marketId: 1, modalPrice: 2600 }), distanceKm: 120 },
        { ...market({ marketId: 2, modalPrice: 2500 }), distanceKm: 10 },
      ],
      input,
    );
    expect(ranked.map((r) => r.marketId)).toEqual([2, 1]);
    expect(ranked[0]!.netValue).toBeGreaterThan(ranked[1]!.netValue);
  });

  it("drops markets beyond the distance limit but keeps unknown distances last", () => {
    const ranked = rankMandis(
      [
        { ...market({ marketId: 1, modalPrice: 3000 }), distanceKm: 400 },
        { ...market({ marketId: 2, modalPrice: 2000 }), distanceKm: 20 },
        { ...market({ marketId: 3, modalPrice: 5000 }), distanceKm: null },
      ],
      input,
    );
    expect(ranked.map((r) => r.marketId)).toEqual([2, 3]);
    // An unknown distance never counts as free transport.
    expect(ranked[1]!.transportCost).toBe(0);
    expect(ranked[1]!.distanceKm).toBeNull();
  });

  it("handles zero quantity and zero transport rate without NaN", () => {
    const ranked = rankMandis([{ ...market({ marketId: 1, modalPrice: 2500 }), distanceKm: 50 }], {
      quantityQuintals: 0,
      transportRatePerKmPerQuintal: 0,
      maxDistanceKm: 100,
    });
    expect(ranked[0]).toMatchObject({ grossValue: 0, transportCost: 0, netValue: 0 });
  });

  it("measures straight-line distance between real places", () => {
    // Lasalgaon to Nashik is roughly 50 km.
    const km = haversineKm({ lat: 20.1435, lng: 74.2378 }, { lat: 19.9975, lng: 73.7898 });
    expect(km).toBeGreaterThan(40);
    expect(km).toBeLessThan(60);
    expect(haversineKm({ lat: 19, lng: 73 }, { lat: 19, lng: 73 })).toBe(0);
  });
});

describe("translation chunking", () => {
  it("keeps chunks within the input limit and never loses text", () => {
    const text = ["A".repeat(400), "B".repeat(400), "C".repeat(400)].join("\n\n");
    const chunks = chunkForTranslation(text, 1000);
    expect(chunks.every((c) => c.length <= 1000)).toBe(true);
    expect(chunks.join("").replace(/\s/g, "")).toBe(text.replace(/\s/g, ""));
  });

  it("splits a very long paragraph at sentence ends", () => {
    const sentence = "This is a sentence about onion prices. ";
    const chunks = chunkForTranslation(sentence.repeat(60), 500);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 500)).toBe(true);
  });
});
