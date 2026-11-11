import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getGroupForUser } from "@/lib/data/groups";
import {
  DeleteGroupButton,
  LeaveGroupButton,
} from "@/components/group-danger-buttons";
import { InviteDialog } from "@/components/invite-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function initials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function GroupPage({
  params,
}: PageProps<"/groups/[id]">) {
  const { id } = await params;
  const session = await auth();
  const data = await getGroupForUser(id, session!.user!.id);

  if (!data) {
    notFound();
  }

  const { group, members, isCreator } = data;

  return (
    <main className="py-8">
      <Link
        href="/groups"
        className="text-sm text-muted-foreground hover:underline"
      >
        ← groups
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{group.name}</h1>
        <div className="flex gap-2">
          <InviteDialog groupId={group.id} />
          {isCreator ? (
            <DeleteGroupButton groupId={group.id} />
          ) : (
            <LeaveGroupButton groupId={group.id} />
          )}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground">members</h2>
        <ul className="mt-3 space-y-2">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-3">
              <Avatar className="size-8">
                <AvatarFallback className="text-xs">
                  {initials(member.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{member.name}</span>
              {member.id === session!.user!.id && (
                <Badge variant="secondary">you</Badge>
              )}
            </li>
          ))}
        </ul>
      </section>

      <Separator className="my-8" />

      <section>
        <h2 className="text-sm font-medium text-muted-foreground">expenses</h2>
        <p className="mt-16 text-center text-muted-foreground">
          no expenses yet
        </p>
      </section>
    </main>
  );
}
