import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  expenses,
  groups,
  memberships,
  recurringExpenses,
  splits,
} from "@/db/schema";
import { getFxRate } from "@/lib/fx";
import { formatMoney } from "@/lib/format";
import { notifyGroupChanged } from "@/lib/realtime";
import {
  catchUpPlan,
  isFrequency,
  nextOccurrence,
  type Frequency,
} from "@/lib/recurring";
import { splitAmounts } from "@/lib/splits";

/**
 * Create real expenses for every recurring rule that is due. Each rule is
 * processed inside a transaction that locks the rule row, so concurrent
 * runs (cron + page loads) can never materialize the same occurrence twice.
 * Occurrences are split equally between the current members.
 */
export async function materializeRecurring(
  groupIds: string[] | null,
): Promise<number> {
  const now = new Date();
  const due = [
    eq(recurringExpenses.active, true),
    lte(recurringExpenses.nextDueAt, now),
  ];

  const rules = await db
    .select()
    .from(recurringExpenses)
    .where(
      groupIds && groupIds.length > 0
        ? and(...due, inArray(recurringExpenses.groupId, groupIds))
        : and(...due),
    );

  let created = 0;

  for (const rule of rules) {
    if (!isFrequency(rule.frequency)) continue;

    const [group] = await db
      .select({ baseCurrency: groups.baseCurrency })
      .from(groups)
      .where(eq(groups.id, rule.groupId))
      .limit(1);
    if (!group) continue;

    created += await db.transaction(async (tx) => {
      await tx.execute(
        sql`select id from recurring_expenses where id = ${rule.id} for update`,
      );
      const [locked] = await tx
        .select()
        .from(recurringExpenses)
        .where(eq(recurringExpenses.id, rule.id))
        .limit(1);
      if (!locked || !locked.active) return 0;

      const memberRows = await tx
        .select({ userId: memberships.userId })
        .from(memberships)
        .where(eq(memberships.groupId, locked.groupId));
      const memberIds = memberRows.map((row) => row.userId);

      if (!memberIds.includes(locked.createdBy)) {
        await tx
          .update(recurringExpenses)
          .set({ active: false })
          .where(eq(recurringExpenses.id, locked.id));
        return 0;
      }

      const plan = catchUpPlan(
        locked.nextDueAt,
        now,
        locked.frequency as Frequency,
      );
      if (plan.length === 0 || memberIds.length === 0) return 0;

      const outcome = splitAmounts(locked.amountCents, "equal", memberIds);
      if (!outcome.ok) return 0;

      const fxRate =
        locked.currency === group.baseCurrency
          ? 1
          : await getFxRate(locked.currency, group.baseCurrency);

      for (const occurrence of plan) {
        const [expense] = await tx
          .insert(expenses)
          .values({
            groupId: locked.groupId,
            paidById: locked.createdBy,
            description: locked.description,
            amountCents: locked.amountCents,
            currency: locked.currency,
            fxRate,
            category: locked.category,
            splitType: "equal",
            createdAt: occurrence,
          })
          .returning({ id: expenses.id });

        await tx.insert(splits).values(
          memberIds.map((id) => ({
            expenseId: expense.id,
            userId: id,
            amountCents: outcome.amounts[id],
          })),
        );

        await tx.insert(activities).values({
          groupId: locked.groupId,
          actorId: locked.createdBy,
          type: "expense_created",
          expenseId: expense.id,
          detail: `“${locked.description}” · ${formatMoney(
            locked.amountCents,
            locked.currency,
          )} (recurring)`,
        });
      }

      const nextDueAt = nextOccurrence(
        plan[plan.length - 1],
        locked.frequency as Frequency,
      );
      await tx
        .update(recurringExpenses)
        .set({ nextDueAt })
        .where(eq(recurringExpenses.id, locked.id));

      await notifyGroupChanged(tx, locked.groupId);
      return plan.length;
    });
  }

  return created;
}
