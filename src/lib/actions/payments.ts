"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { activities, groups, payments, users } from "@/db/schema";
import { currentUser } from "@/lib/session";
import { isMember } from "@/lib/data/groups";
import { formatMoney } from "@/lib/format";
import { notifyGroupChanged } from "@/lib/realtime";

const createPaymentSchema = z.object({
  groupId: z.string().uuid(),
  toUserId: z.string().uuid(),
  amountCents: z.number().int().positive("Enter a valid amount"),
  note: z.string().trim().max(200).optional(),
});

export async function createPayment(
  input: unknown,
): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user) redirect("/login");

  const parsed = createPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { groupId, toUserId, amountCents, note } = parsed.data;
  const fromUserId = user.id;

  if (toUserId === fromUserId) {
    return { error: "You cannot pay yourself" };
  }

  if (!(await isMember(groupId, fromUserId))) {
    return { error: "You are not a member of this group" };
  }
  if (!(await isMember(groupId, toUserId))) {
    return { error: "That person is not a member of this group" };
  }

  const [group] = await db
    .select({ baseCurrency: groups.baseCurrency })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!group) {
    return { error: "Group not found" };
  }

  const [toUser] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, toUserId))
    .limit(1);
  if (!toUser) {
    return { error: "That person is not a member of this group" };
  }

  await db.transaction(async (tx) => {
    const [payment] = await tx
      .insert(payments)
      .values({
        groupId,
        fromUserId,
        toUserId,
        amountCents,
        note: note || null,
      })
      .returning({ id: payments.id });

    await tx.insert(activities).values({
      groupId,
      actorId: fromUserId,
      type: "payment_recorded",
      paymentId: payment.id,
      detail: `paid ${toUser.name} ${formatMoney(amountCents, group.baseCurrency)}`,
    });
    await notifyGroupChanged(tx, groupId);
  });

  revalidatePath(`/groups/${groupId}`);
  return {};
}

export async function deletePayment(paymentId: string) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const [row] = await db
    .select({
      id: payments.id,
      groupId: payments.groupId,
      fromUserId: payments.fromUserId,
      toUserId: payments.toUserId,
      amountCents: payments.amountCents,
      toName: users.name,
    })
    .from(payments)
    .innerJoin(users, eq(payments.toUserId, users.id))
    .where(eq(payments.id, paymentId))
    .limit(1);

  if (!row || row.fromUserId !== user.id) return;

  await db.transaction(async (tx) => {
    await tx.delete(payments).where(eq(payments.id, paymentId));
    await tx.insert(activities).values({
      groupId: row.groupId,
      actorId: user.id,
      type: "payment_deleted",
      detail: `the payment to ${row.toName}`,
    });
    await notifyGroupChanged(tx, row.groupId);
  });

  revalidatePath(`/groups/${row.groupId}`);
}
