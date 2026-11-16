import { eq } from "drizzle-orm";
import { db } from "@/db";
import { expenses, receipts } from "@/db/schema";
import { currentUser } from "@/lib/session";
import { isMember } from "@/lib/data/groups";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  const user = await currentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [receipt] = await db
    .select({
      id: receipts.id,
      contentType: receipts.contentType,
      data: receipts.data,
      groupId: expenses.groupId,
    })
    .from(receipts)
    .innerJoin(expenses, eq(receipts.expenseId, expenses.id))
    .where(eq(receipts.id, id))
    .limit(1);

  if (!receipt || !(await isMember(receipt.groupId, user.id))) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(receipt.data), {
    headers: {
      "Content-Type": receipt.contentType,
      "Content-Length": String(receipt.data.length),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
