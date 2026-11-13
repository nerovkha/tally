import { isSupportedCurrency, type CurrencyCode } from "./currencies";

/**
 * Rates relative to one euro. The static table is only a fallback for when
 * the live rate lookup fails, so the values just need to be plausible.
 */
const STATIC_EUR_TABLE: Record<string, number> = {
  EUR: 1,
  USD: 1.16,
  GBP: 0.84,
  BDT: 140,
  INR: 97,
  PKR: 325,
  AED: 4.26,
  AUD: 1.65,
  CAD: 1.58,
  CHF: 0.88,
  CNY: 8.28,
  DKK: 7.46,
  NOK: 11.7,
  SEK: 11.1,
  PLN: 4.28,
  CZK: 24.9,
  HUF: 395,
  RON: 4.97,
  BGN: 1.96,
  TRY: 47,
  SGD: 1.51,
  MYR: 4.9,
  THB: 37.8,
  BRL: 6.4,
  MXN: 21.2,
  ZAR: 20.5,
  NZD: 1.82,
  HKD: 9.04,
};

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

type EurTable = Record<string, number>;

type Fetcher = (url: string) => Promise<{ rates: Record<string, number> }>;

async function defaultFetcher(url: string) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Rate lookup failed: ${response.status}`);
  return (await response.json()) as { rates: Record<string, number> };
}

let cache: { expiresAt: number; table: EurTable } | null = null;

export function resetFxCache() {
  cache = null;
}

async function getEurTable(fetcher: Fetcher = defaultFetcher): Promise<EurTable> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.table;
  }

  try {
    const { rates } = await fetcher("https://api.frankfurter.dev/v1/latest?base=EUR");
    const table: EurTable = { EUR: 1, ...rates };
    cache = { expiresAt: Date.now() + CACHE_TTL_MS, table };
    return table;
  } catch {
    return STATIC_EUR_TABLE;
  }
}

export function crossRate(table: EurTable, from: string, to: string): number | null {
  const fromRate = table[from];
  const toRate = table[to];
  if (!fromRate || !toRate) return null;
  return toRate / fromRate;
}

export async function getFxRate(
  from: CurrencyCode,
  to: CurrencyCode,
  fetcher: Fetcher = defaultFetcher,
): Promise<number> {
  if (from === to) return 1;

  const table = await getEurTable(fetcher);
  const live = crossRate(table, from, to);
  if (live !== null) return live;

  const fallback = crossRate(STATIC_EUR_TABLE, from, to);
  if (fallback !== null) return fallback;

  throw new Error(`No exchange rate available for ${from} to ${to}`);
}

export function convertCents(cents: number, fxRate: number): number {
  return Math.round(cents * fxRate);
}

export function isSupportedRatePair(from: string, to: string) {
  return isSupportedCurrency(from) && isSupportedCurrency(to);
}
