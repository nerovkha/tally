export type MonthlyPoint = { label: string; cents: number };

/**
 * Bucket expenses into the last `months` calendar months (inclusive of the
 * current one), oldest first. Amounts are expected to already be converted
 * to the group base currency.
 */
export function monthlyTotals(
  expenses: { createdAt: Date | string; baseCents: number }[],
  months = 6,
  now = new Date(),
): MonthlyPoint[] {
  const points: MonthlyPoint[] = [];
  for (let i = 0; i < months; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    points.push({
      label: date.toLocaleString("en", { month: "short" }),
      cents: 0,
    });
  }

  const first =
    (new Date(now.getFullYear(), now.getMonth() - (months - 1), 1).getFullYear() *
      12 +
      new Date(now.getFullYear(), now.getMonth() - (months - 1), 1).getMonth());

  for (const expense of expenses) {
    const date = new Date(expense.createdAt);
    const index = date.getFullYear() * 12 + date.getMonth() - first;
    if (index >= 0 && index < months) {
      points[index].cents += expense.baseCents;
    }
  }

  return points;
}

export type DonutSegment = {
  key: string;
  cents: number;
  fraction: number;
  offsetFraction: number;
};

/**
 * Split a total into consecutive donut segments. `offsetFraction` is the
 * cumulative start position of each segment as a fraction of the circle.
 */
export function donutSegments(
  totals: { key: string; cents: number }[],
): DonutSegment[] {
  const sum = totals.reduce((total, entry) => total + entry.cents, 0);
  if (sum <= 0) return [];

  let cumulative = 0;
  return totals.map((entry) => {
    const fraction = entry.cents / sum;
    const segment: DonutSegment = {
      key: entry.key,
      cents: entry.cents,
      fraction,
      offsetFraction: cumulative,
    };
    cumulative += fraction;
    return segment;
  });
}
