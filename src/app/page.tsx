import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

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
          Split expenses with friends, settle up, and stay even
        </p>
        <div className="flex justify-center gap-3">
          <Button asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/register">Register</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
