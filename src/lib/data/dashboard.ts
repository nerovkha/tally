import { desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { activities } from "@/db/schema";
import { getGroupForUser, getGroupsForUser } from "./groups";
import { getExpensesForGroup } from "./expenses";
import { getPaymentsForGroup } from "./payments";
import { computeNetBalances } from "@/lib/balances";

export type GroupSummary = {
  id: string;
  name: string;
  baseCurrency: string;
  memberCount: number;
  netCents: number;
};

export async function getDashboard(userId: string) {
  const groups = await getGroupsForUser(userId);

  const summaries = await Promise.all(
    groups.map(async (group): Promise<GroupSummary | null> => {
      const data = await getGroupForUser(group.id, userId);
      if (!data) return null;

      const expenses = await getExpensesForGroup(group.id);
      const payments = await getPaymentsForGroup(group.id);
      const net = computeNetBalances(
        data.members.map((member) => member.id),
        expenses.map((expense) => ({
          paidById: expense.paidById,
          amountCents: expense.amountCents,
          fxRate: expense.fxRate,
          splits: expense.splits.map((split) => ({
            userId: split.userId,
            amountCents: split.amountCents,
          })),
        })),
        payments,
      );

      return {
        id: group.id,
        name: group.name,
        baseCurrency: group.baseCurrency,
        memberCount: group.memberCount,
        netCents: net[userId] ?? 0,
      };
    }),
  );

  const valid = summaries.filter(
    (summary): summary is GroupSummary => summary !== null,
  );

  const recentActivity =
    valid.length > 0
      ? await db.query.activities.findMany({
          where: inArray(activities.groupId, valid.map((summary) => summary.id)),
          orderBy: [desc(activities.createdAt)],
          limit: 8,
          with: {
            actor: { columns: { id: true, name: true } },
            group: { columns: { id: true, name: true } },
          },
        })
      : [];

  return { summaries: valid, recentActivity };
}

export async function getGroupAnalytics(groupId: string, userId: string) {
  const data = await getGroupForUser(groupId, userId);
  if (!data) return null;

  const expenses = await getExpensesForGroup(groupId);
  return { group: data.group, expenses };
}
