"use server";

import { isSupportedCurrency } from "@/lib/currencies";
import { getFxRate } from "@/lib/fx";

export async function getFxQuote(
  from: string,
  to: string,
): Promise<{ rate?: number; error?: string }> {
  if (!isSupportedCurrency(from) || !isSupportedCurrency(to)) {
    return { error: "Pick a supported currency" };
  }
  if (from === to) return { rate: 1 };

  try {
    return { rate: await getFxRate(from, to) };
  } catch {
    return { error: "Could not load an exchange rate" };
  }
}
