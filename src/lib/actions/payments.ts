"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { isMember } from "@/lib/data/groups";

const createPaymentSchema = z.object({
  groupId: z.string().uuid(),
  toUserId: z.string().uuid(),
  amountCents: z.number().int().positive("Enter a valid amount"),
  note: z.string().trim().max(200).optional(),
});

export async function createPayment(
  input: unknown,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsed = createPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { groupId, toUserId, amountCents, note } = parsed.data;
  const fromUserId = session.user.id;

  if (toUserId === fromUserId) {
    return { error: "You cannot pay yourself" };
  }

  if (!(await isMember(groupId, fromUserId))) {
    return { error: "You are not a member of this group" };
  }
  if (!(await isMember(groupId, toUserId))) {
    return { error: "That person is not a member of this group" };
  }

  await db.insert(payments).values({
    groupId,
    fromUserId,
    toUserId,
    amountCents,
    note: note || null,
  });

  revalidatePath(`/groups/${groupId}`);
  return {};
}

export async function deletePayment(paymentId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [payment] = await db
    .select({
      id: payments.id,
      groupId: payments.groupId,
      fromUserId: payments.fromUserId,
    })
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);

  if (!payment || payment.fromUserId !== session.user.id) return;

  await db.delete(payments).where(eq(payments.id, paymentId));
  revalidatePath(`/groups/${payment.groupId}`);
}
