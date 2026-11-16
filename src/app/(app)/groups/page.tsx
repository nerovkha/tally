import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { getGroupsForUser } from "@/lib/data/groups";
import { NewGroupDialog } from "@/components/new-group-dialog";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Groups — Tally" };

export default async function GroupsPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/login");
  }

  const groups = await getGroupsForUser(user.id);

  return (
    <main className="py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your groups</h1>
        <NewGroupDialog />
      </div>

      {groups.length === 0 ? (
        <div className="mt-24 text-center text-muted-foreground">
          <p>No groups yet</p>
          <p className="text-sm">
            Create one for your flat, a trip, or dinner club
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {groups.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <Card className="transition-colors hover:border-foreground/25">
                <CardContent className="py-5">
                  <div className="font-medium">{group.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {group.memberCount}{" "}
                    {group.memberCount === 1 ? "member" : "members"} ·{" "}
                    {group.baseCurrency}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
