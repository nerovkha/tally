"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { signIn } from "@/auth";
import { registerSchema } from "@/lib/validation";

export type RegisterState = { error?: string };

export async function register(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, email, password } = parsed.data;

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    return { error: "an account with this email already exists" };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await db.insert(users).values({ name, email, passwordHash });

  await signIn("credentials", { email, password, redirect: false });
  redirect("/groups");
}
