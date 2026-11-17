"use server";

import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { activities, groups, invites, memberships, users } from "@/db/schema";
import { currentUser } from "@/lib/session";
import { getGroupNetBalances, isMember } from "@/lib/data/groups";
import { CURRENCY_CODES } from "@/lib/currencies";
import { notifyGroupChanged } from "@/lib/realtime";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type GroupFormState = { error?: string };

const groupNameSchema = z
  .string()
  .trim()
  .min(1, "Group name is required")
  .max(60, "Keep the name under 60 characters");

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

    await tx.insert(memberships).values({
      groupId: group.id,
      userId: user.id,
      role: "admin",
    });
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

export async function leaveGroup(
  groupId: string,
): Promise<{ error?: string } | undefined> {
  const user = await currentUser();
  if (!user) redirect("/login");

  if (!UUID_RE.test(groupId)) return;

  const [{ memberCount }] = await db
    .select({ memberCount: sql<number>`count(*)::int` })
    .from(memberships)
    .where(eq(memberships.groupId, groupId));

  if (memberCount > 1) {
    const net = await getGroupNetBalances(groupId);
    if ((net[user.id] ?? 0) !== 0) {
      return { error: "Settle your balance before leaving this group" };
    }
  }

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

async function requireAdmin(groupId: string, userId: string) {
  const [membership] = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(
      and(eq(memberships.groupId, groupId), eq(memberships.userId, userId)),
    )
    .limit(1);

  return membership?.role === "admin";
}

export async function renameGroup(
  groupId: string,
  name: string,
): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user) redirect("/login");

  if (!UUID_RE.test(groupId)) return { error: "Group not found" };

  const parsed = groupNameSchema.safeParse(name);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (!(await requireAdmin(groupId, user.id))) {
    return { error: "Only admins can rename the group" };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(groups)
      .set({ name: parsed.data })
      .where(eq(groups.id, groupId));
    await tx.insert(activities).values({
      groupId,
      actorId: user.id,
      type: "group_renamed",
      detail: `“${parsed.data}”`,
    });
    await notifyGroupChanged(tx, groupId);
  });

  revalidatePath(`/groups/${groupId}`);
  return {};
}

export async function removeMember(
  groupId: string,
  memberId: string,
): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user) redirect("/login");

  if (!UUID_RE.test(groupId) || !UUID_RE.test(memberId)) {
    return { error: "Not found" };
  }
  if (memberId === user.id) {
    return { error: "Use leave group instead" };
  }
  if (!(await requireAdmin(groupId, user.id))) {
    return { error: "Only admins can remove members" };
  }

  const net = await getGroupNetBalances(groupId);
  if ((net[memberId] ?? 0) !== 0) {
    return { error: "That member still has a balance to settle" };
  }

  const [member] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, memberId))
    .limit(1);

  await db.transaction(async (tx) => {
    await tx
      .delete(memberships)
      .where(
        and(eq(memberships.groupId, groupId), eq(memberships.userId, memberId)),
      );
    await tx.insert(activities).values({
      groupId,
      actorId: user.id,
      type: "member_removed",
      detail: member?.name ?? "a member",
    });
    await notifyGroupChanged(tx, groupId);
  });

  revalidatePath(`/groups/${groupId}`);
  return {};
}

export async function setMemberRole(
  groupId: string,
  memberId: string,
  role: "admin" | "member",
): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user) redirect("/login");

  if (!UUID_RE.test(groupId) || !UUID_RE.test(memberId)) {
    return { error: "Not found" };
  }
  if (!(await requireAdmin(groupId, user.id))) {
    return { error: "Only admins can change roles" };
  }

  const admins = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(
      and(eq(memberships.groupId, groupId), eq(memberships.role, "admin")),
    );

  if (role === "member" && admins.length === 1 && admins[0].userId === memberId) {
    return { error: "Promote another admin first" };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(memberships)
      .set({ role })
      .where(
        and(eq(memberships.groupId, groupId), eq(memberships.userId, memberId)),
      );
    await notifyGroupChanged(tx, groupId);
  });

  revalidatePath(`/groups/${groupId}`);
  return {};
}

export async function createInvite(groupId: string) {  const user = await currentUser();
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
