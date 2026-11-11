import Link from "next/link";
import { auth } from "@/auth";
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
          <AlertTitle>this invite is invalid or expired</AlertTitle>
          <AlertDescription>
            ask a group member for a fresh link
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  const session = await auth();

  if (session?.user && (await isMember(invite.groupId, session.user.id))) {
    return (
      <main className="grid flex-1 place-items-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>{invite.groupName}</CardTitle>
            <CardDescription>
              you are already a member of this group
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href={`/groups/${invite.groupId}`}>go to group</Link>
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
          <CardTitle>join {invite.groupName}?</CardTitle>
          <CardDescription>
            {session?.user
              ? "you will be added as a member of this group"
              : "log in or register first, then you can join"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={acceptInvite}>
            <input type="hidden" name="token" value={token} />
            <Button type="submit" className="w-full">
              {session?.user ? "join group" : "log in and join"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
