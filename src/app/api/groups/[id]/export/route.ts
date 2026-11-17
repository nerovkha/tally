import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { expenses, groups } from "@/db/schema";
import { currentUser } from "@/lib/session";
import { isMember } from "@/lib/data/groups";
import { centsToDecimal, toCsv } from "@/lib/csv";
import { convertCents } from "@/lib/fx";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await currentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [group] = await db
    .select({ name: groups.name, baseCurrency: groups.baseCurrency })
    .from(groups)
    .where(eq(groups.id, id))
    .limit(1);

  if (!group || !(await isMember(id, user.id))) {
    return new Response("Not found", { status: 404 });
  }

  const rows = await db.query.expenses.findMany({
    where: eq(expenses.groupId, id),
    orderBy: [desc(expenses.createdAt)],
    limit: 1000,
    with: { paidBy: { columns: { name: true } } },
  });

  const csv = toCsv(
    [
      "Date",
      "Description",
      "Category",
      "Paid by",
      "Amount",
      "Currency",
      `Rate to ${group.baseCurrency}`,
      `Amount in ${group.baseCurrency}`,
    ],
    rows.map((expense) => [
      new Date(expense.createdAt).toISOString().slice(0, 10),
      expense.description,
      expense.category,
      expense.paidBy.name,
      centsToDecimal(expense.amountCents),
      expense.currency,
      expense.fxRate.toFixed(4),
      centsToDecimal(convertCents(expense.amountCents, expense.fxRate)),
    ]),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tally-${group.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv"`,
    },
  });
}
