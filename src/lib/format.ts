const day = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
});

const moneyFormatters = new Map<string, Intl.NumberFormat>();

function moneyFormatter(currency: string): Intl.NumberFormat {
  let formatter = moneyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency,
    });
    moneyFormatters.set(currency, formatter);
  }
  return formatter;
}

export function formatMoney(cents: number, currency = "EUR"): string {
  return moneyFormatter(currency).format(cents / 100);
}

export function moneySymbol(currency = "EUR"): string {
  const parts = moneyFormatter(currency).formatToParts(0);
  return parts.find((part) => part.type === "currency")?.value ?? currency;
}

export function formatDay(date: Date | string): string {
  return day.format(new Date(date));
}

export function parseAmountToCents(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }
  return Math.round(parseFloat(trimmed) * 100);
}
