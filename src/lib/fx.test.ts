import { afterEach, describe, expect, it } from "vitest";
import { convertCents, crossRate, getFxRate, resetFxCache } from "./fx";

afterEach(() => {
  resetFxCache();
});

describe("crossRate", () => {
  const table = { EUR: 1, USD: 1.2, GBP: 0.8 };

  it("derives a cross rate through the euro table", () => {
    expect(crossRate(table, "USD", "GBP")).toBeCloseTo(0.8 / 1.2);
    expect(crossRate(table, "EUR", "USD")).toBeCloseTo(1.2);
    expect(crossRate(table, "USD", "EUR")).toBeCloseTo(1 / 1.2);
  });

  it("returns null when either currency is missing", () => {
    expect(crossRate(table, "USD", "BDT")).toBeNull();
    expect(crossRate(table, "BDT", "USD")).toBeNull();
  });
});

describe("convertCents", () => {
  it("rounds to the nearest cent", () => {
    expect(convertCents(2450, 1)).toBe(2450);
    expect(convertCents(2450, 1.16)).toBe(2842);
    expect(convertCents(100, 0.845)).toBe(85);
    expect(convertCents(100, 0.835)).toBe(84);
  });
});

describe("getFxRate", () => {
  it("returns 1 for identical currencies without fetching", async () => {
    expect(await getFxRate("EUR", "EUR")).toBe(1);
    expect(await getFxRate("USD", "USD")).toBe(1);
  });

  it("uses live rates when the fetch succeeds", async () => {
    const rate = await getFxRate("USD", "EUR", async () => ({
      rates: { USD: 1.25 },
    }));
    expect(rate).toBeCloseTo(0.8);
  });

  it("serves the second call from the cache", async () => {
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      return { rates: { USD: 2 } };
    };
    expect(await getFxRate("USD", "EUR", fetcher)).toBeCloseTo(0.5);
    expect(await getFxRate("USD", "EUR", fetcher)).toBeCloseTo(0.5);
    expect(calls).toBe(1);
  });

  it("falls back to static rates when the fetch fails", async () => {
    const fetcher = async () => {
      throw new Error("offline");
    };
    const rate = await getFxRate("USD", "EUR", fetcher);
    expect(rate).toBeCloseTo(1 / 1.16);
  });

  it("resolves currencies missing from the live table via the fallback", async () => {
    const fetcher = async () => ({ rates: { USD: 1.25 } });
    const rate = await getFxRate("BDT", "USD", fetcher);
    expect(rate).toBeCloseTo(1.16 / 140);
  });

  it("throws for unsupported currencies", async () => {
    await expect(
      getFxRate("XXX" as "USD", "EUR", async () => ({ rates: {} })),
    ).rejects.toThrow("No exchange rate available");
  });
});
