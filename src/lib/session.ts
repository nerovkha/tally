import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * The authenticated user, checked against the database. Sessions are
 * JWT-backed, so a stale cookie can outlive its user row — callers get
 * null and should treat the request as logged out.
 */
export async function currentUser() {
  const session = await auth();
  const id = session?.user?.id;

  if (!id) return null;

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return user ?? null;
}
