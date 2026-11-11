const money = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});

const day = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
});

export function formatMoney(cents: number): string {
  return money.format(cents / 100);
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
