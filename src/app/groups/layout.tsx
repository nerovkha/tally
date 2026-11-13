import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { UserMenu } from "@/components/user-menu";

export const dynamic = "force-dynamic";

export default async function GroupsLayout({
  children,
}: LayoutProps<"/groups">) {
  const user = await currentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4">
          <Link href="/groups" className="text-lg font-semibold tracking-tight">
            Tally
          </Link>
          <UserMenu name={user.name} email={user.email} />
        </div>
      </header>
      <div className="mx-auto w-full max-w-4xl flex-1 px-4">{children}</div>
    </div>
  );
}
