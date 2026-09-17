import { describe, expect, it } from "vitest";
import { buildChartGeometry, niceStep, splitOnGaps, summarizeSeries } from "@/lib/chart";
import { computeSeasonality } from "@/lib/seasonality";
import {
  computeChange,
  formatNumber,
  formatPercent,
  formatRupees,
  formatUsdMillion,
  perKg,
  perTonne,
} from "@/lib/format";

const series = Array.from({ length: 10 }, (_, i) => ({
  date: `2026-09-${String(i + 1).padStart(2, "0")}`,
  value: 2000 + i * 50,
  min: 1900 + i * 50,
  max: 2100 + i * 50,
}));

describe("chart geometry", () => {
  it("returns null without data", () => {
    expect(buildChartGeometry([])).toBeNull();
  });

  it("maps points inside the plot area with nice ticks", () => {
    const g = buildChartGeometry(series)!;
    expect(g.linePaths).toHaveLength(1);
    expect(g.bandPaths).toHaveLength(1);
    expect(g.domain.min).toBeLessThanOrEqual(1900);
    expect(g.domain.max).toBeGreaterThanOrEqual(2550);
    expect(g.yTicks.length).toBeGreaterThanOrEqual(3);
    expect(g.yTicks.every((t) => t.y >= 0 && t.y <= g.height)).toBe(true);
    expect(g.xTicks.every((t) => t.x >= g.padding.left - 1 && t.x <= g.width)).toBe(true);
    expect(g.lastPoint!.x).toBeCloseTo(g.width - g.padding.right, 0);
  });

  it("does not draw a line across a reporting gap", () => {
    const withGap = [...series.slice(0, 3), { date: "2026-09-25", value: 2500, min: 2400, max: 2600 }];
    expect(splitOnGaps(withGap)).toHaveLength(2);
    expect(buildChartGeometry(withGap)!.linePaths).toHaveLength(2);
  });

  it("includes the MSP line in the value range", () => {
    const g = buildChartGeometry(series, { msp: 3000 })!;
    expect(g.domain.max).toBeGreaterThanOrEqual(3000);
    expect(g.mspY).not.toBeNull();
  });

  it("handles a flat series without dividing by zero", () => {
    const flat = [
      { date: "2026-09-01", value: 100 },
      { date: "2026-09-02", value: 100 },
    ];
    const g = buildChartGeometry(flat)!;
    expect(g.yTicks.every((t) => Number.isFinite(t.y))).toBe(true);
    expect(g.linePaths[0]).not.toContain("NaN");
  });

  it("chooses readable tick steps", () => {
    expect(niceStep(1000)).toBe(250);
    expect(niceStep(9)).toBe(2.5);
    expect(niceStep(0)).toBe(1);
  });

  it("summarizes a series in words for screen readers", () => {
    const text = summarizeSeries(series, "Onion national median price");
    expect(text).toContain("lowest ₹2,000 on 01 Sep 2026");
    expect(text).toContain("latest ₹2,450 on 10 Sep 2026");
    expect(summarizeSeries([], "x")).toBe("No x data in this period.");
  });
});

describe("seasonality", () => {
  const monthly = Array.from({ length: 14 }, (_, i) => {
    const month = new Date(Date.UTC(2025, 7 + i, 1)).toISOString().slice(0, 10);
    return { month, avg: 2000 + (i % 12) * 100, min: 1800, max: 2400, days: 20 };
  });

  it("needs 12 months of data", () => {
    expect(computeSeasonality(monthly.slice(0, 11))).toBeNull();
    expect(computeSeasonality(monthly)).not.toBeNull();
  });

  it("averages each calendar month across years and ranks the highest", () => {
    const result = computeSeasonality(monthly)!;
    expect(result.months).toHaveLength(12);
    expect(result.highest).toHaveLength(3);
    expect(result.highest[0]!.average).toBeGreaterThanOrEqual(result.highest[1]!.average);
    expect(result.months.find((m) => m.name === "August")!.years).toBe(2);
  });
});

describe("formatting", () => {
  it("uses Indian digit grouping and units", () => {
    expect(formatRupees(125000)).toBe("₹1,25,000");
    expect(formatRupees(null)).toBe("—");
    expect(formatNumber(1234567)).toBe("12,34,567");
    expect(formatPercent(4.237)).toBe("4.2%");
    expect(formatUsdMillion(1234.5)).toBe("US$1,234.5 million");
    expect(formatUsdMillion(0.04)).toBe("US$0.04 million");
  });

  it("computes change with direction", () => {
    expect(computeChange(2000, 2200)).toMatchObject({ absolute: 200, direction: "up" });
    expect(computeChange(2000, 1800)!.direction).toBe("down");
    expect(computeChange(2000, 2000)!.direction).toBe("flat");
    expect(computeChange(0, 100)).toBeNull();
    expect(computeChange(null, 100)).toBeNull();
  });

  it("converts units", () => {
    expect(perKg(2500)).toBe(25);
    expect(perTonne(2500)).toBe(25000);
  });
});
