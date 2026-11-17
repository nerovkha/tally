import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { recurringExpenses } from "@/db/schema";

export async function getRecurringForGroup(groupId: string) {
  return db.query.recurringExpenses.findMany({
    where: and(
      eq(recurringExpenses.groupId, groupId),
      eq(recurringExpenses.active, true),
    ),
    orderBy: [asc(recurringExpenses.nextDueAt)],
    with: { createdByUser: { columns: { id: true, name: true } } },
  });
}
