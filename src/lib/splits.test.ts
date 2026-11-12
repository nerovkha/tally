import { describe, expect, it } from "vitest";
import { splitAmounts } from "./splits";

describe("splitAmounts", () => {
  describe("equal", () => {
    it("splits evenly when divisible", () => {
      const result = splitAmounts(1000, "equal", ["a", "b"]);
      expect(result).toEqual({ ok: true, amounts: { a: 500, b: 500 } });
    });

    it("gives remainder cents to the first participants", () => {
      const result = splitAmounts(1000, "equal", ["a", "b", "c"]);
      expect(result).toEqual({
        ok: true,
        amounts: { a: 334, b: 333, c: 333 },
      });
    });

    it("never loses a cent", () => {
      const result = splitAmounts(999, "equal", ["a", "b", "c", "d"]);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Object.values(result.amounts).reduce((a, b) => a + b, 0)).toBe(
          999,
        );
      }
    });

    it("supports a single participant", () => {
      const result = splitAmounts(123, "equal", ["a"]);
      expect(result).toEqual({ ok: true, amounts: { a: 123 } });
    });
  });

  describe("exact", () => {
    it("accepts shares that sum to the total", () => {
      const result = splitAmounts(1000, "exact", ["a", "b"], {
        a: 250,
        b: 750,
      });
      expect(result).toEqual({ ok: true, amounts: { a: 250, b: 750 } });
    });

    it("rejects shares that do not sum to the total", () => {
      const result = splitAmounts(1000, "exact", ["a", "b"], {
        a: 250,
        b: 700,
      });
      expect(result).toEqual({ ok: false, error: "Shares must add up to the total" });
    });

    it("rejects missing shares", () => {
      const result = splitAmounts(1000, "exact", ["a", "b"], { a: 1000 });
      expect(result.ok).toBe(false);
    });
  });

  describe("percent", () => {
    it("splits cleanly divisible percentages", () => {
      const result = splitAmounts(1000, "percent", ["a", "b"], { a: 30, b: 70 });
      expect(result).toEqual({ ok: true, amounts: { a: 300, b: 700 } });
    });

    it("hands remainder cents to the largest fractions", () => {
      const result = splitAmounts(999, "percent", ["a", "b", "c"], {
        a: 50,
        b: 30,
        c: 20,
      });
      expect(result).toEqual({
        ok: true,
        amounts: { a: 499, b: 300, c: 200 },
      });
    });

    it("rejects percentages that do not total 100", () => {
      const result = splitAmounts(1000, "percent", ["a", "b"], { a: 40, b: 40 });
      expect(result).toEqual({
        ok: false,
        error: "Percentages must add up to 100",
      });
    });
  });

  describe("validation", () => {
    it("rejects zero, negative, and non-integer totals", () => {
      expect(splitAmounts(0, "equal", ["a"]).ok).toBe(false);
      expect(splitAmounts(-5, "equal", ["a"]).ok).toBe(false);
      expect(splitAmounts(10.5, "equal", ["a"]).ok).toBe(false);
    });

    it("rejects an empty participant list", () => {
      expect(splitAmounts(100, "equal", []).ok).toBe(false);
    });

    it("rejects duplicate participants", () => {
      expect(splitAmounts(100, "equal", ["a", "a"]).ok).toBe(false);
    });
  });
});
