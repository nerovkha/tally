import { describe, expect, it } from "vitest";
import { formatMoney, parseAmountToCents } from "./format";

describe("parseAmountToCents", () => {
  it("parses plain amounts", () => {
    expect(parseAmountToCents("24.50")).toBe(2450);
    expect(parseAmountToCents("100")).toBe(10000);
    expect(parseAmountToCents("0.99")).toBe(99);
  });

  it("accepts a comma as the decimal separator", () => {
    expect(parseAmountToCents("24,50")).toBe(2450);
  });

  it("rejects malformed amounts", () => {
    expect(parseAmountToCents("abc")).toBeNull();
    expect(parseAmountToCents("12.345")).toBeNull();
    expect(parseAmountToCents("-5")).toBeNull();
    expect(parseAmountToCents("")).toBeNull();
  });
});

describe("formatMoney", () => {
  it("formats cents as euro", () => {
    expect(formatMoney(1525)).toBe("€15.25");
    expect(formatMoney(3050)).toBe("€30.50");
    expect(formatMoney(5)).toBe("€0.05");
  });
});
