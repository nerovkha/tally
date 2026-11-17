"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { groups, recurringExpenses } from "@/db/schema";
import { currentUser } from "@/lib/session";
import { isMember } from "@/lib/data/groups";
import { CATEGORY_SLUGS, DEFAULT_CATEGORY } from "@/lib/categories";
import { CURRENCY_CODES } from "@/lib/currencies";
import { isFrequency } from "@/lib/recurring";
import { notifyGroupChanged } from "@/lib/realtime";

const createRecurringSchema = z.object({
  groupId: z.string().uuid(),
  description: z.string().trim().min(1, "Description is required").max(200),
  amountCents: z.number().int().positive("Enter a valid amount"),
  currency: z
    .enum(CURRENCY_CODES, { error: "Pick a supported currency" })
    .default("EUR"),
  category: z
    .enum(CATEGORY_SLUGS, { error: "Pick a supported category" })
    .default(DEFAULT_CATEGORY),
  frequency: z.string().refine(isFrequency, "Pick a frequency"),
  // YYYY-MM-DD from the date input
  nextDueAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a start date"),
});

export async function createRecurringRule(
  input: unknown,
): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user) redirect("/login");

  const parsed = createRecurringSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { groupId, description, amountCents, currency, category, frequency } =
    parsed.data;

  if (!(await isMember(groupId, user.id))) {
    return { error: "You are not a member of this group" };
  }

  const [group] = await db
    .select({ baseCurrency: groups.baseCurrency })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!group) {
    return { error: "Group not found" };
  }

  const nextDueAt = new Date(`${parsed.data.nextDueAt}T00:00:00`);

  await db.transaction(async (tx) => {
    await tx.insert(recurringExpenses).values({
      groupId,
      createdBy: user.id,
      description,
      amountCents,
      currency,
      category,
      frequency,
      nextDueAt,
      active: true,
    });
    await notifyGroupChanged(tx, groupId);
  });

  revalidatePath(`/groups/${groupId}`);
  return {};
}

export async function deleteRecurringRule(ruleId: string, groupId: string) {
  const user = await currentUser();
  if (!user) redirect("/login");

  if (!(await isMember(groupId, user.id))) return;

  await db.transaction(async (tx) => {
    await tx
      .delete(recurringExpenses)
      .where(
        and(
          eq(recurringExpenses.id, ruleId),
          eq(recurringExpenses.groupId, groupId),
        ),
      );
    await notifyGroupChanged(tx, groupId);
  });

  revalidatePath(`/groups/${groupId}`);
}
