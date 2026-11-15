"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { activities, expenses, groups, splits } from "@/db/schema";
import { currentUser } from "@/lib/session";
import { getMemberIds, isMember } from "@/lib/data/groups";
import { getFxRate } from "@/lib/fx";
import { formatMoney } from "@/lib/format";
import { splitAmounts } from "@/lib/splits";
import { createExpenseSchema } from "@/lib/validation";

export async function createExpense(input: unknown): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user) redirect("/login");

  const parsed = createExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const {
    groupId,
    description,
    amountCents,
    currency,
    category,
    splitType,
    participantIds,
  } = parsed.data;

  if (!(await isMember(groupId, user.id))) {
    return { error: "You are not a member of this group" };
  }

  const memberIds = new Set(await getMemberIds(groupId));
  if (!participantIds.every((id) => memberIds.has(id))) {
    return { error: "Participants must be members of this group" };
  }

  const [group] = await db
    .select({ baseCurrency: groups.baseCurrency })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!group) {
    return { error: "Group not found" };
  }

  let fxRate = 1;
  if (currency !== group.baseCurrency) {
    fxRate = parsed.data.fxRate ?? NaN;
    if (!Number.isFinite(fxRate)) {
      try {
        fxRate = await getFxRate(currency, group.baseCurrency);
      } catch {
        return { error: "Could not resolve an exchange rate" };
      }
    }
    if (!Number.isFinite(fxRate) || fxRate <= 0 || fxRate > 10000) {
      return { error: "Enter a valid exchange rate" };
    }
  }

  const values = Object.fromEntries(
    participantIds.map(
      (id): [string, number] => [id, parsed.data.values[id] ?? 0],
    ),
  );

  const outcome = splitAmounts(amountCents, splitType, participantIds, values);
  if (!outcome.ok) {
    return { error: outcome.error };
  }

  await db.transaction(async (tx) => {
    const [expense] = await tx
      .insert(expenses)
      .values({
        groupId,
        paidById: user.id,
        description,
        amountCents,
        currency,
        fxRate,
        category,
        splitType,
      })
      .returning({ id: expenses.id });

    await tx.insert(splits).values(
      participantIds.map((id) => ({
        expenseId: expense.id,
        userId: id,
        amountCents: outcome.amounts[id],
      })),
    );

    await tx.insert(activities).values({
      groupId,
      actorId: user.id,
      type: "expense_created",
      expenseId: expense.id,
      detail: `“${description}” · ${formatMoney(amountCents, currency)}`,
    });
  });

  revalidatePath(`/groups/${groupId}`);
  return {};
}

export async function deleteExpense(expenseId: string, groupId: string) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const [expense] = await db
    .select({
      id: expenses.id,
      paidById: expenses.paidById,
      description: expenses.description,
      amountCents: expenses.amountCents,
      currency: expenses.currency,
    })
    .from(expenses)
    .where(and(eq(expenses.id, expenseId), eq(expenses.groupId, groupId)))
    .limit(1);

  if (!expense || expense.paidById !== user.id) return;

  await db.transaction(async (tx) => {
    await tx.delete(expenses).where(eq(expenses.id, expenseId));
    await tx.insert(activities).values({
      groupId,
      actorId: user.id,
      type: "expense_deleted",
      detail: `“${expense.description}” · ${formatMoney(
        expense.amountCents,
        expense.currency,
      )}`,
    });
  });

  revalidatePath(`/groups/${groupId}`);
}
