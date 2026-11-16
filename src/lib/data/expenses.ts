import { asc, desc, eq } from "drizzle-orm";
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
