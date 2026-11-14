export const CATEGORIES = [
  { slug: "general", name: "General", emoji: "🧾" },
  { slug: "groceries", name: "Groceries", emoji: "🛒" },
  { slug: "dining", name: "Dining out", emoji: "🍽️" },
  { slug: "transport", name: "Transport", emoji: "🚕" },
  { slug: "accommodation", name: "Accommodation", emoji: "🏠" },
  { slug: "entertainment", name: "Entertainment", emoji: "🎟️" },
  { slug: "utilities", name: "Utilities", emoji: "💡" },
  { slug: "travel", name: "Travel", emoji: "✈️" },
  { slug: "shopping", name: "Shopping", emoji: "🛍️" },
  { slug: "health", name: "Health", emoji: "💊" },
  { slug: "drinks", name: "Drinks", emoji: "🍻" },
  { slug: "other", name: "Other", emoji: "📦" },
] as const;

export type Category = (typeof CATEGORIES)[number];
export type CategorySlug = Category["slug"];

export const CATEGORY_SLUGS = CATEGORIES.map(
  (category) => category.slug,
) as [CategorySlug, ...CategorySlug[]];

export const DEFAULT_CATEGORY: CategorySlug = "general";

export function isCategorySlug(slug: string): slug is CategorySlug {
  return (CATEGORY_SLUGS as readonly string[]).includes(slug);
}

export function categoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((category) => category.slug === slug);
}

export type CategoryExpense = {
  category: string;
  amountCents: number;
  fxRate: number;
};

/**
 * Total spend per category in the group base currency, largest first.
 */
export function categoryTotals(expenses: CategoryExpense[]) {
  const totals = new Map<string, number>();
  for (const expense of expenses) {
    const converted = Math.round(expense.amountCents * expense.fxRate);
    totals.set(expense.category, (totals.get(expense.category) ?? 0) + converted);
  }
  return [...totals.entries()]
    .map(([category, cents]) => ({ category, cents }))
    .sort((a, b) => b.cents - a.cents);
}
