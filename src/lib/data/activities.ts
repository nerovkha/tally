import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { activities } from "@/db/schema";

export async function getActivityForGroup(groupId: string, limit = 20) {
  return db.query.activities.findMany({
    where: eq(activities.groupId, groupId),
    orderBy: [desc(activities.createdAt)],
    limit,
    with: { actor: { columns: { id: true, name: true } } },
  });
}
