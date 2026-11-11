import { and, desc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { groups, invites, memberships, users } from "@/db/schema";

export async function getGroupsForUser(userId: string) {
  const rows = await db
    .select({
      id: groups.id,
      name: groups.name,
      createdAt: groups.createdAt,
    })
    .from(memberships)
    .innerJoin(groups, eq(memberships.groupId, groups.id))
    .where(eq(memberships.userId, userId))
    .orderBy(desc(groups.createdAt));

  if (rows.length === 0) {
    return [];
  }

  const counts = await db
    .select({
      groupId: memberships.groupId,
      memberCount: sql<number>`count(*)::int`,
    })
    .from(memberships)
    .where(
      inArray(
        memberships.groupId,
        rows.map((row) => row.id),
      ),
    )
    .groupBy(memberships.groupId);

  const countByGroup = new Map(counts.map((count) => [count.groupId, count.memberCount]));

  return rows.map((row) => ({
    ...row,
    memberCount: countByGroup.get(row.id) ?? 0,
  }));
}

export async function getGroupForUser(groupId: string, userId: string) {
  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group) return null;

  const [membership] = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(
      and(eq(memberships.groupId, groupId), eq(memberships.userId, userId)),
    )
    .limit(1);

  if (!membership) return null;

  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      joinedAt: memberships.joinedAt,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.groupId, groupId))
    .orderBy(memberships.joinedAt);

  return { group, members, isCreator: group.createdBy === userId };
}

export async function getValidInvite(inviteId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(inviteId)) {
    return null;
  }

  try {
    const [invite] = await db
      .select({
        id: invites.id,
        groupId: invites.groupId,
        groupName: groups.name,
      })
      .from(invites)
      .innerJoin(groups, eq(invites.groupId, groups.id))
      .where(
        and(
          eq(invites.id, inviteId),
          or(isNull(invites.expiresAt), gt(invites.expiresAt, new Date())),
        ),
      )
      .limit(1);

    return invite ?? null;
  } catch {
    return null;
  }
}

export async function isMember(groupId: string, userId: string) {
  const [membership] = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(
      and(eq(memberships.groupId, groupId), eq(memberships.userId, userId)),
    )
    .limit(1);

  return Boolean(membership);
}
