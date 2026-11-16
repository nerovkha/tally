import { describe, expect, it } from "vitest";
import { donutSegments, monthlyTotals } from "./charts";

const NOW = new Date("2026-11-16T12:00:00Z");

function monthDate(monthsAgo: number, day = 3) {
  return new Date(NOW.getFullYear(), NOW.getMonth() - monthsAgo, day);
}

describe("monthlyTotals", () => {
  it("returns empty buckets for the last months, oldest first", () => {
    const points = monthlyTotals([], 3, NOW);
    expect(points.map((p) => p.label)).toEqual(["Sep", "Oct", "Nov"]);
    expect(points.every((p) => p.cents === 0)).toBe(true);
  });

  it("sums expenses into their calendar month", () => {
    const points = monthlyTotals(
      [
        { createdAt: monthDate(0), baseCents: 1000 },
        { createdAt: monthDate(0, 20), baseCents: 500 },
        { createdAt: monthDate(2), baseCents: 2000 },
      ],
      3,
      NOW,
    );
    expect(points).toEqual([
      { label: "Sep", cents: 2000 },
      { label: "Oct", cents: 0 },
      { label: "Nov", cents: 1500 },
    ]);
  });

  it("ignores expenses outside the window", () => {
    const points = monthlyTotals(
      [{ createdAt: monthDate(6), baseCents: 9999 }],
      3,
      NOW,
    );
    expect(points.reduce((sum, p) => sum + p.cents, 0)).toBe(0);
  });

  it("wraps correctly across a year boundary", () => {
    const points = monthlyTotals(
      [{ createdAt: new Date(2025, 11, 20), baseCents: 700 }],
      14,
      NOW,
    );
    expect(points[2]).toEqual({ label: "Dec", cents: 700 });
  });
});

describe("donutSegments", () => {
  it("computes fractions and cumulative offsets", () => {
    const segments = donutSegments([
      { key: "travel", cents: 750 },
      { key: "food", cents: 250 },
    ]);
    expect(segments).toEqual([
      { key: "travel", cents: 750, fraction: 0.75, offsetFraction: 0 },
      { key: "food", cents: 250, fraction: 0.25, offsetFraction: 0.75 },
    ]);
  });

  it("returns nothing when the total is zero", () => {
    expect(donutSegments([{ key: "a", cents: 0 }])).toEqual([]);
  });

  it("gives every segment its full offset chain", () => {
    const segments = donutSegments([
      { key: "a", cents: 1 },
      { key: "b", cents: 1 },
      { key: "c", cents: 2 },
    ]);
    const last = segments[segments.length - 1];
    expect(last.offsetFraction + last.fraction).toBeCloseTo(1);
  });
});
