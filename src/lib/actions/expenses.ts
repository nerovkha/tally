"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { expenses, splits } from "@/db/schema";
import { getMemberIds, isMember } from "@/lib/data/groups";
import { splitAmounts } from "@/lib/splits";
import { createExpenseSchema } from "@/lib/validation";

export async function createExpense(input: unknown): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsed = createExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { groupId, description, amountCents, splitType, participantIds } =
    parsed.data;

  if (!(await isMember(groupId, session.user.id))) {
    return { error: "You are not a member of this group" };
  }

  const memberIds = new Set(await getMemberIds(groupId));
  if (!participantIds.every((id) => memberIds.has(id))) {
    return { error: "Participants must be members of this group" };
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
        paidById: session.user!.id,
        description,
        amountCents,
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
  });

  revalidatePath(`/groups/${groupId}`);
  return {};
}

export async function deleteExpense(expenseId: string, groupId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [expense] = await db
    .select({ id: expenses.id, paidById: expenses.paidById })
    .from(expenses)
    .where(and(eq(expenses.id, expenseId), eq(expenses.groupId, groupId)))
    .limit(1);

  if (!expense || expense.paidById !== session.user.id) return;

  await db.delete(expenses).where(eq(expenses.id, expenseId));
  revalidatePath(`/groups/${groupId}`);
}
