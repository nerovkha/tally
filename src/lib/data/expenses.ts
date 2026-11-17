import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "@/db";
import { comments, expenses } from "@/db/schema";

export async function getExpensesForGroup(groupId: string) {
  return db.query.expenses.findMany({
    where: eq(expenses.groupId, groupId),
    orderBy: [desc(expenses.createdAt)],
    limit: 100,
    with: {
      paidBy: { columns: { id: true, name: true } },
      splits: { with: { user: { columns: { id: true, name: true } } } },
      comments: {
        with: { user: { columns: { id: true, name: true } } },
        orderBy: [asc(comments.createdAt)],
      },
      receipts: { columns: { id: true } },
    },
  });
}

export type ExpensePageQuery = {
  q?: string;
  category?: string | null;
  offset: number;
  limit: number;
};

export async function getExpensePage(
  groupId: string,
  query: ExpensePageQuery,
) {
  const filters = [eq(expenses.groupId, groupId)];
  if (query.q) {
    filters.push(ilike(expenses.description, `%${query.q}%`));
  }
  if (query.category) {
    filters.push(eq(expenses.category, query.category));
  }
  const where = and(...filters);

  const rows = await db.query.expenses.findMany({
    where,
    orderBy: [desc(expenses.createdAt)],
    offset: query.offset,
    limit: query.limit,
    with: {
      paidBy: { columns: { id: true, name: true } },
      splits: { with: { user: { columns: { id: true, name: true } } } },
      comments: {
        with: { user: { columns: { id: true, name: true } } },
        orderBy: [asc(comments.createdAt)],
      },
      receipts: { columns: { id: true } },
    },
  });

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(expenses)
    .where(where);

  return { rows, total: count };
}
