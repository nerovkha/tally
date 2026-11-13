import Link from "next/link";
import { currentUser } from "@/lib/session";
import { getValidInvite, isMember } from "@/lib/data/groups";
import { acceptInvite } from "@/lib/actions/groups";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invite — Tally" };

export default async function InvitePage({
  params,
}: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const invite = await getValidInvite(token);

  if (!invite) {
    return (
      <main className="grid flex-1 place-items-center px-4">
        <Alert variant="destructive" className="max-w-sm">
          <AlertTitle>This invite is invalid or expired</AlertTitle>
          <AlertDescription>
            Ask a group member for a fresh link
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  const user = await currentUser();

  if (user && (await isMember(invite.groupId, user.id))) {
    return (
      <main className="grid flex-1 place-items-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>{invite.groupName}</CardTitle>
            <CardDescription>
              You are already a member of this group
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href={`/groups/${invite.groupId}`}>Go to group</Link>
            </Button>
          </CardFooter>
        </Card>
      </main>
    );
  }

  return (
    <main className="grid flex-1 place-items-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Join {invite.groupName}?</CardTitle>
          <CardDescription>
            {user
              ? "You'll be added as a member of this group"
              : "Log in or register first, then you can join"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={acceptInvite}>
            <input type="hidden" name="token" value={token} />
            <Button type="submit" className="w-full">
              {user ? "Join group" : "Log in and join"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
