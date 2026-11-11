"use server";

import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { groups, invites, memberships } from "@/db/schema";
import { isMember } from "@/lib/data/groups";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type GroupFormState = { error?: string };

const groupNameSchema = z
  .string()
  .trim()
  .min(1, "group name is required")
  .max(60, "keep the name under 60 characters");

export async function createGroup(
  _prev: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsed = groupNameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const groupId = await db.transaction(async (tx) => {
    const [group] = await tx
      .insert(groups)
      .values({ name: parsed.data, createdBy: session.user!.id })
      .returning({ id: groups.id });

    await tx
      .insert(memberships)
      .values({ groupId: group.id, userId: session.user!.id });

    return group.id;
  });

  revalidatePath("/groups");
  redirect(`/groups/${groupId}`);
}

export async function deleteGroup(groupId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (!UUID_RE.test(groupId)) return;

  const [group] = await db
    .select({ createdBy: groups.createdBy })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group || group.createdBy !== session.user.id) return;

  await db.delete(groups).where(eq(groups.id, groupId));
  revalidatePath("/groups");
  redirect("/groups");
}

export async function leaveGroup(groupId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (!UUID_RE.test(groupId)) return;

  const [{ memberCount }] = await db
    .select({ memberCount: sql<number>`count(*)::int` })
    .from(memberships)
    .where(eq(memberships.groupId, groupId));

  await db
    .delete(memberships)
    .where(
      and(eq(memberships.groupId, groupId), eq(memberships.userId, session.user.id)),
    );

  if (memberCount === 1) {
    await db.delete(groups).where(eq(groups.id, groupId));
  }

  revalidatePath("/groups");
  redirect("/groups");
}

export async function createInvite(groupId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const member = await isMember(groupId, session.user.id);
  if (!member) {
    return { error: "you are not a member of this group" };
  }

  const [invite] = await db
    .insert(invites)
    .values({ groupId, createdBy: session.user.id })
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

  const session = await auth();
  if (!session?.user?.id) {
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

  await db
    .insert(memberships)
    .values({ groupId: invite.groupId, userId: session!.user!.id })
    .onConflictDoNothing();

  revalidatePath("/groups");
  redirect(`/groups/${invite.groupId}`);
}
