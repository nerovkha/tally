"use server";

import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { activities, groups, invites, memberships } from "@/db/schema";
import { currentUser } from "@/lib/session";
import { isMember } from "@/lib/data/groups";
import { CURRENCY_CODES } from "@/lib/currencies";
import { notifyGroupChanged } from "@/lib/realtime";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type GroupFormState = { error?: string };

const createGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Group name is required")
    .max(60, "Keep the name under 60 characters"),
  currency: z
    .enum(CURRENCY_CODES, { error: "Pick a supported currency" })
    .default("EUR"),
});

export async function createGroup(
  _prev: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const user = await currentUser();
  if (!user) redirect("/login");

  const parsed = createGroupSchema.safeParse({
    name: formData.get("name"),
    currency: formData.get("currency") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const groupId = await db.transaction(async (tx) => {
    const [group] = await tx
      .insert(groups)
      .values({
        name: parsed.data.name,
        baseCurrency: parsed.data.currency,
        createdBy: user.id,
      })
      .returning({ id: groups.id });

    await tx.insert(memberships).values({ groupId: group.id, userId: user.id });
    await tx.insert(activities).values({
      groupId: group.id,
      actorId: user.id,
      type: "group_created",
    });
    await notifyGroupChanged(tx, group.id);

    return group.id;
  });

  revalidatePath("/groups");
  redirect(`/groups/${groupId}`);
}

export async function deleteGroup(groupId: string) {
  const user = await currentUser();
  if (!user) redirect("/login");

  if (!UUID_RE.test(groupId)) return;

  const [group] = await db
    .select({ createdBy: groups.createdBy })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group || group.createdBy !== user.id) return;

  await db.delete(groups).where(eq(groups.id, groupId));
  revalidatePath("/groups");
  redirect("/groups");
}

export async function leaveGroup(groupId: string) {
  const user = await currentUser();
  if (!user) redirect("/login");

  if (!UUID_RE.test(groupId)) return;

  const [{ memberCount }] = await db
    .select({ memberCount: sql<number>`count(*)::int` })
    .from(memberships)
    .where(eq(memberships.groupId, groupId));

  await db.transaction(async (tx) => {
    await tx
      .delete(memberships)
      .where(
        and(eq(memberships.groupId, groupId), eq(memberships.userId, user.id)),
      );

    if (memberCount === 1) {
      await tx.delete(groups).where(eq(groups.id, groupId));
    } else {
      await tx.insert(activities).values({
        groupId,
        actorId: user.id,
        type: "member_left",
      });
      await notifyGroupChanged(tx, groupId);
    }
  });

  revalidatePath("/groups");
  redirect("/groups");
}

export async function createInvite(groupId: string) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const member = await isMember(groupId, user.id);
  if (!member) {
    return { error: "You are not a member of this group" };
  }

  const [invite] = await db
    .insert(invites)
    .values({ groupId, createdBy: user.id })
    .returning({ id: invites.id });

  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const proto =
    headerList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");

  return { url: `${proto}://${host}/invite/${invite.id}` };
}

export async function acceptInvite(formData: FormData) {
  const token = String(formData.get("token") ?? "");

  if (!UUID_RE.test(token)) redirect("/groups");

  const user = await currentUser();
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const [invite] = await db
    .select({ groupId: invites.groupId })
    .from(invites)
    .where(
      and(
        eq(invites.id, token),
        or(isNull(invites.expiresAt), gt(invites.expiresAt, new Date())),
      ),
    )
    .limit(1);

  if (!invite) redirect("/groups");

  await db.transaction(async (tx) => {
    const joined = await tx
      .insert(memberships)
      .values({ groupId: invite.groupId, userId: user.id })
      .onConflictDoNothing()
      .returning({ userId: memberships.userId });

    if (joined.length > 0) {
      await tx.insert(activities).values({
        groupId: invite.groupId,
        actorId: user.id,
        type: "member_joined",
      });
      await notifyGroupChanged(tx, invite.groupId);
    }
  });

  revalidatePath("/groups");
  redirect(`/groups/${invite.groupId}`);
}
