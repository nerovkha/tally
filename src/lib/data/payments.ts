import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";

export async function getPaymentsForGroup(groupId: string) {
  return db.query.payments.findMany({
    where: eq(payments.groupId, groupId),
    orderBy: [desc(payments.createdAt)],
    limit: 100,
    with: {
      fromUser: { columns: { id: true, name: true } },
      toUser: { columns: { id: true, name: true } },
    },
  });
}
