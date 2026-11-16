"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { comments, expenses } from "@/db/schema";
import { currentUser } from "@/lib/session";
import { isMember } from "@/lib/data/groups";
import { notifyGroupChanged } from "@/lib/realtime";

const createCommentSchema = z.object({
  expenseId: z.string().uuid(),
  body: z
    .string()
    .trim()
    .min(1, "Write a comment first")
    .max(500, "Keep comments under 500 characters"),
});

export async function createComment(
  input: unknown,
): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user) redirect("/login");

  const parsed = createCommentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { expenseId, body } = parsed.data;

  const [expense] = await db
    .select({ groupId: expenses.groupId })
    .from(expenses)
    .where(eq(expenses.id, expenseId))
    .limit(1);

  if (!expense) return { error: "Expense not found" };
  if (!(await isMember(expense.groupId, user.id))) {
    return { error: "You are not a member of this group" };
  }

  await db.transaction(async (tx) => {
    await tx.insert(comments).values({ expenseId, userId: user.id, body });
    await notifyGroupChanged(tx, expense.groupId);
  });

  revalidatePath(`/groups/${expense.groupId}`);
  return {};
}

export async function deleteComment(commentId: string) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const [comment] = await db
    .select({
      id: comments.id,
      userId: comments.userId,
      groupId: expenses.groupId,
    })
    .from(comments)
    .innerJoin(expenses, eq(comments.expenseId, expenses.id))
    .where(eq(comments.id, commentId))
    .limit(1);

  if (!comment || comment.userId !== user.id) return;

  await db.transaction(async (tx) => {
    await tx.delete(comments).where(eq(comments.id, commentId));
    await notifyGroupChanged(tx, comment.groupId);
  });

  revalidatePath(`/groups/${comment.groupId}`);
}
