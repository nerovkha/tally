import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Paperclip } from "lucide-react";
import { currentUser } from "@/lib/session";
import {
  categoryBySlug,
  categoryTotals,
  isCategorySlug,
} from "@/lib/categories";
import { getGroupForUser } from "@/lib/data/groups";
import { getExpensesForGroup } from "@/lib/data/expenses";
import { getPaymentsForGroup } from "@/lib/data/payments";
import { getActivityForGroup } from "@/lib/data/activities";
import { activitySentence } from "@/lib/activities";
import {
  computeNetBalances,
  settlementTransfers,
} from "@/lib/balances";
import { convertCents } from "@/lib/fx";
import { formatDay, formatMoney } from "@/lib/format";
import {
  DeleteGroupButton,
  LeaveGroupButton,
} from "@/components/group-danger-buttons";
import { ExpenseDialog } from "@/components/expense-dialog";
import { DeleteExpenseButton } from "@/components/delete-expense-button";
import { CommentButton } from "@/components/comment-button";
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

function balanceLabel(net: number, currency: string) {
  if (net > 0) {
    return {
      text: `gets ${formatMoney(net, currency)}`,
      className: "text-emerald-600",
    };
  }
  if (net < 0) {
    return {
      text: `owes ${formatMoney(-net, currency)}`,
      className: "text-red-600",
    };
  }
  return { text: "settled up", className: "text-muted-foreground" };
}

export default async function GroupPage({
  params,
  searchParams,
}: PageProps<"/groups/[id]">) {
  const { id } = await params;
  const { category } = await searchParams;
  const activeCategory =
    typeof category === "string" && isCategorySlug(category) ? category : null;
  const user = await currentUser();

  if (!user) {
    redirect("/login");
  }

  const data = await getGroupForUser(id, user.id);

  if (!data) {
    notFound();
  }

  const { group, members, isCreator } = data;
  const userId = user.id;
  const base = group.baseCurrency;
  const expenses = await getExpensesForGroup(group.id);
  const payments = await getPaymentsForGroup(group.id);
  const activity = await getActivityForGroup(group.id);

  const net = computeNetBalances(
    members.map((member) => member.id),
    expenses.map((expense) => ({
      paidById: expense.paidById,
      amountCents: expense.amountCents,
      fxRate: expense.fxRate,
      splits: expense.splits.map((split) => ({
        userId: split.userId,
        amountCents: split.amountCents,
      })),
    })),
    payments,
  );
  const transfers = settlementTransfers(net);
  const totals = categoryTotals(
    expenses.map((expense) => ({
      category: expense.category,
      amountCents: expense.amountCents,
      fxRate: expense.fxRate,
    })),
  );
  const presentCategories = [...new Set(expenses.map((e) => e.category))]
    .filter(isCategorySlug)
    .map((slug) => categoryBySlug(slug))
    .filter((meta) => meta !== undefined);
  const visibleExpenses = activeCategory
    ? expenses.filter((expense) => expense.category === activeCategory)
    : expenses;
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
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{group.name}</h1>
          <Badge variant="outline">{base}</Badge>
        </div>
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
            currency={base}
          />
        </div>

        <ul className="mt-4 space-y-2">
          {members.map((member) => {
            const balance = balanceLabel(net[member.id] ?? 0, base);
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
                      {formatMoney(transfer.amountCents, base)}
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

      {expenses.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground">
            Spending by category
          </h2>
          <ul className="mt-4 space-y-2">
            {totals.slice(0, 6).map(({ category: slug, cents }) => {
              const meta = categoryBySlug(slug);
              return (
                <li key={slug} className="flex items-center justify-between">
                  <span className="text-sm">
                    {meta?.emoji} {meta?.name ?? slug}
                  </span>
                  <span className="text-sm font-medium">
                    {formatMoney(cents, base)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

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
            baseCurrency={base}
          />
        </div>

        {presentCategories.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/groups/${group.id}`}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                activeCategory
                  ? "text-muted-foreground hover:border-foreground/25"
                  : "border-foreground/30 bg-secondary"
              }`}
            >
              All
            </Link>
            {presentCategories.map((meta) => (
              <Link
                key={meta.slug}
                href={`/groups/${group.id}?category=${meta.slug}`}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  activeCategory === meta.slug
                    ? "border-foreground/30 bg-secondary"
                    : "text-muted-foreground hover:border-foreground/25"
                }`}
              >
                {meta.emoji} {meta.name}
              </Link>
            ))}
          </div>
        )}

        {visibleExpenses.length === 0 ? (
          <p className="mt-16 text-center text-muted-foreground">
            {activeCategory
              ? "No expenses in this category"
              : "No expenses yet"}
          </p>
        ) : (
          <ul id="expenses-list" className="mt-4 divide-y">
            {visibleExpenses.map((expense) => {
              const myShare = expense.splits.find(
                (split) => split.user.id === userId,
              )?.amountCents;
              const canDelete = expense.paidBy.id === userId;
              const foreign = expense.currency !== base;

              return (
                <li
                  key={expense.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      <span className="mr-1" aria-hidden>
                        {categoryBySlug(expense.category)?.emoji ?? "🧾"}
                      </span>
                      {expense.description}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {expense.paidBy.name} paid · {formatDay(expense.createdAt)}
                      {myShare !== undefined &&
                        ` · Your share ${formatMoney(myShare, expense.currency)}`}
                      {foreign &&
                        ` · ≈ ${formatMoney(convertCents(expense.amountCents, expense.fxRate), base)}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">
                      {formatMoney(expense.amountCents, expense.currency)}
                    </span>
                    {expense.receipts[0] && (
                      <a
                        href={`/api/receipts/${expense.receipts[0].id}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Receipt for ${expense.description}`}
                        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Paperclip className="size-4" />
                      </a>
                    )}
                    <CommentButton
                      expenseId={expense.id}
                      expenseLabel={expense.description}
                      comments={expense.comments}
                      currentUserId={userId}
                    />
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
                      {formatMoney(payment.amountCents, base)}
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

      {activity.length > 0 && (
        <>
          <Separator className="my-8" />
          <section>
            <h2 className="text-sm font-medium text-muted-foreground">
              Activity
            </h2>
            <ul className="mt-4 space-y-3">
              {activity.map((event) => (
                <li key={event.id} className="flex items-center gap-3">
                  <Avatar className="size-7">
                    <AvatarFallback className="text-[10px]">
                      {initials(event.actor.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate text-sm">
                      {activitySentence({
                        type: event.type,
                        actorName: event.actor.name,
                        detail: event.detail,
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDay(event.createdAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
