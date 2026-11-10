import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SignOutButton from "@/components/sign-out-button";

export const metadata = { title: "Groups — Tally" };

export default async function GroupsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">your groups</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{session.user.name}</span>
          <SignOutButton />
        </div>
      </header>
      <p className="mt-16 text-center text-muted-foreground">no groups yet</p>
    </main>
  );
}
