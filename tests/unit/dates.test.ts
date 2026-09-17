import { describe, expect, it } from "vitest";
import { describeDataDate, formatDataDate, todayInIst } from "@/lib/dates";

describe("data dates", () => {
  it("uses the IST calendar date, not UTC", () => {
    // 20:00 UTC on 16 Sep is 01:30 IST on 17 Sep.
    expect(todayInIst(new Date("2026-09-16T20:00:00Z"))).toBe("2026-09-17");
    expect(todayInIst(new Date("2026-09-16T18:00:00Z"))).toBe("2026-09-16");
  });

  it("formats dates as DD MMM YYYY", () => {
    expect(formatDataDate("2026-09-07")).toBe("07 Sep 2026");
    expect(() => formatDataDate("2026-13-01")).toThrow();
  });

  it("labels data 'today' only when the arrival date is today in IST", () => {
    const now = new Date("2026-09-17T06:00:00Z");
    expect(describeDataDate("2026-09-17", now)).toBe("today");
    expect(describeDataDate("2026-09-16", now)).toBe("16 Sep 2026");
  });
});
