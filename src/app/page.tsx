import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/groups");
  }

  return (
    <main className="grid flex-1 place-items-center px-4">
      <div className="max-w-md space-y-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight">Tally</h1>
        <p className="text-lg text-muted-foreground">
          split expenses with friends, settle up, stay even
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/login"
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            log in
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-input px-5 py-2.5 text-sm font-medium hover:bg-accent"
          >
            register
          </Link>
        </div>
      </div>
    </main>
  );
}
