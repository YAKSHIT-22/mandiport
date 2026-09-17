import { describe, expect, it } from "vitest";
import sample from "../../fixtures/datagovin/mandi-daily-sample.json";
import { normalizeMandiRecord } from "@/lib/datagovin";
import { parseCsvRecords } from "@/lib/datagovin/csv";

const base = {
  state: "Maharashtra",
  district: "Pune",
  market: "APMC Pune ",
  commodity: "Onion",
  variety: "Red",
  grade: "FAQ",
  arrival_date: "17/09/2026",
  min_price: 1500,
  max_price: 2200,
  modal_price: 1900,
};

describe("normalizeMandiRecord", () => {
  it("accepts every record in the recorded API sample", () => {
    expect(sample.length).toBeGreaterThan(0);
    for (const raw of sample) {
      const result = normalizeMandiRecord(raw);
      expect(result.ok, JSON.stringify(raw)).toBe(true);
    }
  });

  it("normalizes text, dates and prices", () => {
    const result = normalizeMandiRecord(base);
    expect(result).toEqual({
      ok: true,
      value: {
        state: "Maharashtra",
        district: "Pune",
        market: "APMC Pune",
        commodity: "Onion",
        variety: "Red",
        grade: "FAQ",
        arrivalDate: "2026-09-17",
        minPrice: 1500,
        maxPrice: 2200,
        modalPrice: 1900,
      },
    });
  });

  it("accepts prices sent as strings", () => {
    const result = normalizeMandiRecord({
      ...base,
      min_price: "1500",
      max_price: "2,200",
      modal_price: "1900.0",
    });
    expect(result.ok && result.value.maxPrice).toBe(2200);
  });

  it("accepts CSV-style headers (Min_x0020_Price, Arrival_Date)", () => {
    const [row] = parseCsvRecords(
      "State,District,Market,Commodity,Variety,Grade,Arrival_Date,Min_x0020_Price,Max_x0020_Price,Modal_x0020_Price\n" +
        'Tripura,Dhalai,"Kulai APMC",Papaya(Raw),Other,"Grade B",17/09/2026,1600,2000,1800\n',
    );
    const result = normalizeMandiRecord(row!);
    expect(result.ok && result.value).toMatchObject({
      market: "Kulai APMC",
      minPrice: 1600,
      modalPrice: 1800,
    });
  });

  it.each([
    [{ state: " " }, "missing_state"],
    [{ district: "" }, "missing_district"],
    [{ market: null }, "missing_market"],
    [{ commodity: undefined }, "missing_commodity"],
    [{ arrival_date: "2026-09-17" }, "invalid_arrival_date"],
    [{ min_price: "NR" }, "invalid_min_price"],
    [{ max_price: 0 }, "invalid_max_price"],
    [{ modal_price: "" }, "invalid_modal_price"],
    [{ min_price: 3000 }, "min_above_max"],
    [{ modal_price: 2500 }, "modal_outside_range"],
  ])("rejects %j as %s", (patch, reason) => {
    const result = normalizeMandiRecord({ ...base, ...patch });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toBe(reason);
  });

  it("keeps optional variety and grade as null when blank", () => {
    const result = normalizeMandiRecord({ ...base, variety: "", grade: "  " });
    expect(result.ok && [result.value.variety, result.value.grade]).toEqual([null, null]);
  });
});
