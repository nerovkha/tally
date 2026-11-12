import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export async function POST() {
  if (process.env.E2E !== "1") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await db.execute(
    sql`TRUNCATE payments, splits, expenses, memberships, invites, groups, users CASCADE`,
  );

  return NextResponse.json({ ok: true });
}
