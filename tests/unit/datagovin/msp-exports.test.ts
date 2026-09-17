import { describe, expect, it } from "vitest";
import allCrops from "../../fixtures/datagovin/msp-all-crops.json";
import rabiRms from "../../fixtures/datagovin/msp-rabi-rms.json";
import exportSample from "../../fixtures/datagovin/exports-2022-23-sample.json";
import { normalizeMspRows, shiftYearLabel } from "@/lib/datagovin/msp";
import { countryDisplayName, exportKey, normalizeExportRow } from "@/lib/datagovin/exports";

describe("MSP normalizer (real fixtures)", () => {
  const { records, rejects } = normalizeMspRows([...allCrops, ...rabiRms]);
  const find = (name: string, season: string, year: string, variety: string | null = null) =>
    records.find(
      (r) => r.canonicalName === name && r.season === season && r.year === year && r.variety === variety,
    );

  it("maps every published crop and agrees across the two tables", () => {
    expect(rejects).toEqual([]);
  });

  it("keeps kharif crop years as marketing seasons", () => {
    expect(find("Paddy", "kharif", "2024-25", "Common")).toMatchObject({
      mspPrice: 2300,
      mandiName: "Paddy(Common)",
    });
    expect(find("Paddy", "kharif", "2024-25", "Grade A")).toMatchObject({ mspPrice: 2320, mandiName: null });
  });

  it("converts rabi crop year X to marketing season X+1", () => {
    // Crop year 2024-25 (table 1) and RMS 2025-26 (table 2) are the same wheat MSP.
    expect(find("Wheat", "rabi", "2025-26")).toMatchObject({ mspPrice: 2425, mandiName: "Wheat" });
    expect(find("Wheat", "rabi", "2014-15")).toMatchObject({ mspPrice: 1400 });
  });

  it("skips NA values instead of inventing a price", () => {
    expect(find("Soyabean", "kharif", "2024-25", "Black")).toBeUndefined();
    expect(find("Soyabean", "kharif", "2024-25", "Yellow")).toMatchObject({ mspPrice: 4892 });
  });

  it("rejects unmapped names and conflicting values", () => {
    const result = normalizeMspRows([
      { commodity: "Unknown crop", category: "Kharif Crops", variety: "NA", _2024_25: 100 },
      { commodities: "Wheat", rms_2025_26: 9999 },
      { commodities: "Wheat", rms_2025_26: 2425 },
    ]);
    expect(result.rejects.map((r) => r.reason)).toEqual([
      "unmapped_msp_name:Unknown crop",
      "conflicting_msp_values",
    ]);
  });

  it("shifts year labels across centuries", () => {
    expect(shiftYearLabel("2099-00", 1)).toBe("2100-01");
    expect(shiftYearLabel("2024-25", 1)).toBe("2025-26");
  });
});

describe("export normalizer", () => {
  it("normalizes the recorded 2022-23 sample", () => {
    const results = exportSample.map((r) => normalizeExportRow(r));
    expect(results.every((r) => r.ok)).toBe(true);
    const first = results[0]!;
    expect(first.ok && first.value.commodityKey).toBe(exportKey(exportSample[0]!.principle_commodity));
  });

  it("handles year-specific field names and string values", () => {
    const r = normalizeExportRow({
      commodity: "RICE -BASMOTI",
      country: "U ARAB EMTS",
      unit: "TON",
      quantity_: "1,200",
      value_us_million_: "3.5",
    });
    expect(r).toEqual({
      ok: true,
      value: {
        commodityKey: "RICE BASMOTI",
        commodityName: "RICE -BASMOTI",
        country: "U ARAB EMTS",
        unit: "TON",
        quantity: 1200,
        valueUsdMillion: 3.5,
      },
    });
  });

  it("rejects missing or invalid values", () => {
    expect(
      normalizeExportRow({ principle_commodity: "TEA", country: "", value_us__million_: 1 }),
    ).toMatchObject({ ok: false });
    expect(
      normalizeExportRow({ principle_commodity: "TEA", country: "NEPAL", value_us__million_: "n/a" }),
    ).toMatchObject({ ok: false });
  });

  it("normalizes commodity names that vary by year to one key", () => {
    expect(exportKey("RICE -BASMOTI")).toBe(exportKey("RICE BASMOTI"));
    expect(exportKey("RICE(OTHER THAN BASMOTI)")).toBe("RICE OTHER THAN BASMOTI");
  });

  it("expands known country abbreviations and title-cases the rest", () => {
    expect(countryDisplayName("U S A")).toBe("United States");
    expect(countryDisplayName("NEPAL")).toBe("Nepal");
  });
});
