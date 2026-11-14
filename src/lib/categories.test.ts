import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  categoryBySlug,
  categoryTotals,
  isCategorySlug,
} from "./categories";

describe("categories", () => {
  it("has unique slugs with a name and emoji each", () => {
    const slugs = CATEGORIES.map((category) => category.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const category of CATEGORIES) {
      expect(category.name.length).toBeGreaterThan(0);
      expect(category.emoji.length).toBeGreaterThan(0);
    }
  });

  it("looks up categories by slug", () => {
    expect(categoryBySlug("groceries")?.name).toBe("Groceries");
    expect(categoryBySlug("nope")).toBeUndefined();
  });

  it("validates slugs", () => {
    expect(isCategorySlug("dining")).toBe(true);
    expect(isCategorySlug("nope")).toBe(false);
  });
});

describe("categoryTotals", () => {
  it("sums converted amounts per category, largest first", () => {
    const totals = categoryTotals([
      { category: "groceries", amountCents: 3000, fxRate: 1 },
      { category: "transport", amountCents: 1000, fxRate: 1 },
      { category: "groceries", amountCents: 2000, fxRate: 1 },
      { category: "travel", amountCents: 10000, fxRate: 1.16 },
    ]);
    expect(totals).toEqual([
      { category: "travel", cents: 11600 },
      { category: "groceries", cents: 5000 },
      { category: "transport", cents: 1000 },
    ]);
  });

  it("rounds each expense before summing", () => {
    const totals = categoryTotals([
      { category: "dining", amountCents: 999, fxRate: 1.005 },
      { category: "dining", amountCents: 999, fxRate: 1.005 },
    ]);
    expect(totals).toEqual([{ category: "dining", cents: 2008 }]);
  });
});
