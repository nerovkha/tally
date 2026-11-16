"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { expenses, receipts } from "@/db/schema";
import { currentUser } from "@/lib/session";
import { isMember } from "@/lib/data/groups";
import { notifyGroupChanged } from "@/lib/realtime";
import {
  detectImageType,
  receiptSizeError,
} from "@/lib/images";

export async function attachReceipt(
  expenseId: string,
  file: File,
): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user) redirect("/login");

  if (file.size === 0) {
    return { error: "Choose an image to attach" };
  }
  const sizeError = receiptSizeError(file.size);
  if (sizeError) {
    return { error: sizeError };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = detectImageType(bytes);
  if (!contentType) {
    return { error: "Receipts must be PNG, JPEG, or WebP images" };
  }

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
    await tx.delete(receipts).where(eq(receipts.expenseId, expenseId));
    await tx.insert(receipts).values({
      expenseId,
      uploadedBy: user.id,
      contentType,
      byteSize: bytes.byteLength,
      data: Buffer.from(bytes),
    });
    await notifyGroupChanged(tx, expense.groupId);
  });

  revalidatePath(`/groups/${expense.groupId}`);
  return {};
}
