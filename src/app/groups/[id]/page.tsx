import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getGroupForUser } from "@/lib/data/groups";
import { getExpensesForGroup } from "@/lib/data/expenses";
import { getPaymentsForGroup } from "@/lib/data/payments";
import {
  computeNetBalances,
  settlementTransfers,
} from "@/lib/balances";
import { formatDay, formatMoney } from "@/lib/format";
import {
  DeleteGroupButton,
  LeaveGroupButton,
} from "@/components/group-danger-buttons";
import { ExpenseDialog } from "@/components/expense-dialog";
import { DeleteExpenseButton } from "@/components/delete-expense-button";
import { DeletePaymentButton } from "@/components/delete-payment-button";
import { InviteDialog } from "@/components/invite-dialog";
import { SettleButton } from "@/components/settle-button";
import { SettleDialog } from "@/components/settle-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function initials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function balanceLabel(net: number) {
  if (net > 0) {
    return { text: `gets ${formatMoney(net)}`, className: "text-emerald-600" };
  }
  if (net < 0) {
    return { text: `owes ${formatMoney(-net)}`, className: "text-red-600" };
  }
  return { text: "settled up", className: "text-muted-foreground" };
}

export default async function GroupPage({
  params,
}: PageProps<"/groups/[id]">) {
  const { id } = await params;
  const session = await auth();
  const data = await getGroupForUser(id, session!.user!.id);

  if (!data) {
    notFound();
  }

  const { group, members, isCreator } = data;
  const userId = session!.user!.id;
  const expenses = await getExpensesForGroup(group.id);
  const payments = await getPaymentsForGroup(group.id);

  const net = computeNetBalances(
    members.map((member) => member.id),
    expenses.map((expense) => ({
      paidById: expense.paidById,
      amountCents: expense.amountCents,
      splits: expense.splits.map((split) => ({
        userId: split.userId,
        amountCents: split.amountCents,
      })),
    })),
    payments,
  );
  const transfers = settlementTransfers(net);
  const nameById = new Map(members.map((member) => [member.id, member.name]));
  const memberOptions = members.map(({ id: memberId, name }) => ({
    id: memberId,
    name,
  }));

  return (
    <main className="py-8">
      <Link
        href="/groups"
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Groups
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{group.name}</h1>
        <div className="flex gap-2">
          <InviteDialog groupId={group.id} />
          {isCreator ? (
            <DeleteGroupButton groupId={group.id} />
          ) : (
            <LeaveGroupButton groupId={group.id} />
          )}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground">Members</h2>
        <ul className="mt-3 space-y-2">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-3">
              <Avatar className="size-8">
                <AvatarFallback className="text-xs">
                  {initials(member.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{member.name}</span>
              {member.id === userId && <Badge variant="secondary">You</Badge>}
            </li>
          ))}
        </ul>
      </section>

      <Separator className="my-8" />

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            Balances
          </h2>
          <SettleDialog
            groupId={group.id}
            members={memberOptions}
            currentUserId={userId}
          />
        </div>

        <ul className="mt-4 space-y-2">
          {members.map((member) => {
            const balance = balanceLabel(net[member.id] ?? 0);
            return (
              <li key={member.id} className="flex items-center justify-between">
                <span className="text-sm">{member.name}</span>
                <span className={`text-sm font-medium ${balance.className}`}>
                  {balance.text}
                </span>
              </li>
            );
          })}
        </ul>

        {transfers.length > 0 && (
          <div className="mt-6 rounded-lg border p-4">
            <h3 className="text-sm font-medium">Suggested settlements</h3>
            <ul className="mt-3 space-y-3">
              {transfers.map((transfer) => (
                <li
                  key={`${transfer.fromUserId}-${transfer.toUserId}`}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-sm">
                    {nameById.get(transfer.fromUserId)} pays{" "}
                    {nameById.get(transfer.toUserId)}{" "}
                    <span className="font-medium">
                      {formatMoney(transfer.amountCents)}
                    </span>
                  </span>
                  {transfer.fromUserId === userId && (
                    <SettleButton
                      groupId={group.id}
                      toUserId={transfer.toUserId}
                      amountCents={transfer.amountCents}
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <Separator className="my-8" />

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            Expenses
          </h2>
          <ExpenseDialog
            groupId={group.id}
            members={memberOptions}
            currentUserId={userId}
          />
        </div>

        {expenses.length === 0 ? (
          <p className="mt-16 text-center text-muted-foreground">
            No expenses yet
          </p>
        ) : (
          <ul className="mt-4 divide-y">
            {expenses.map((expense) => {
              const myShare = expense.splits.find(
                (split) => split.user.id === userId,
              )?.amountCents;
              const canDelete = expense.paidBy.id === userId;

              return (
                <li
                  key={expense.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {expense.description}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {expense.paidBy.name} paid · {formatDay(expense.createdAt)}
                      {myShare !== undefined && ` · Your share ${formatMoney(myShare)}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">
                      {formatMoney(expense.amountCents)}
                    </span>
                    {canDelete && (
                      <DeleteExpenseButton
                        expenseId={expense.id}
                        groupId={group.id}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {payments.length > 0 && (
        <>
          <Separator className="my-8" />
          <section>
            <h2 className="text-sm font-medium text-muted-foreground">
              Payments
            </h2>
            <ul className="mt-4 divide-y">
              {payments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {payment.fromUser.name} paid {payment.toUser.name}{" "}
                      {formatMoney(payment.amountCents)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDay(payment.createdAt)}
                    </div>
                  </div>
                  {payment.fromUser.id === userId && (
                    <DeletePaymentButton paymentId={payment.id} />
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
