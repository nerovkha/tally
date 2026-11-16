import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { getDashboard, getGroupAnalytics } from "@/lib/data/dashboard";
import { activitySentence } from "@/lib/activities";
import { categoryBySlug, categoryTotals } from "@/lib/categories";
import { donutSegments, monthlyTotals } from "@/lib/charts";
import { formatDay, formatMoney } from "@/lib/format";
import { CategoryDonut, TrendBars } from "@/components/charts";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard — Tally" };

export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  const { group: selectedId } = await searchParams;
  const user = await currentUser();

  if (!user) {
    redirect("/login");
  }

  const { summaries, recentActivity } = await getDashboard(user.id);

  if (summaries.length === 0) {
    return (
      <main className="py-24 text-center text-muted-foreground">
        <p>Create a group to see your dashboard</p>
        <Link href="/groups" className="text-sm underline">
          Go to groups
        </Link>
      </main>
    );
  }

  const active =
    summaries.find((summary) => summary.id === selectedId) ?? summaries[0];
  const analytics = await getGroupAnalytics(active.id, user.id);

  const owedByCurrency = new Map<string, number>();
  const oweByCurrency = new Map<string, number>();
  for (const summary of summaries) {
    if (summary.netCents > 0) {
      owedByCurrency.set(
        summary.baseCurrency,
        (owedByCurrency.get(summary.baseCurrency) ?? 0) + summary.netCents,
      );
    } else if (summary.netCents < 0) {
      oweByCurrency.set(
        summary.baseCurrency,
        (oweByCurrency.get(summary.baseCurrency) ?? 0) - summary.netCents,
      );
    }
  }

  const trend = analytics
    ? monthlyTotals(
        analytics.expenses.map((expense) => ({
          createdAt: expense.createdAt,
          baseCents: Math.round(expense.amountCents * expense.fxRate),
        })),
      )
    : [];
  const topCategories = analytics
    ? categoryTotals(
        analytics.expenses.map((expense) => ({
          category: expense.category,
          amountCents: expense.amountCents,
          fxRate: expense.fxRate,
        })),
      ).slice(0, 8)
    : [];
  const segments = donutSegments(
    topCategories.map((total) => ({ key: total.category, cents: total.cents })),
  ).map((segment) => {
    const meta = categoryBySlug(segment.key);
    return {
      ...segment,
      label: meta?.name ?? segment.key,
      emoji: meta?.emoji ?? "🧾",
    };
  });

  return (
    <main className="py-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <section className="mt-6">
        <h2 className="text-sm font-medium text-muted-foreground">
          Across your groups
        </h2>
        {owedByCurrency.size === 0 && oweByCurrency.size === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            You are all settled up
          </p>
        ) : (
          <div className="mt-2 space-y-1">
            {[...owedByCurrency.entries()].map(([currency, cents]) => (
              <p key={`owed-${currency}`} className="text-sm text-emerald-600">
                You are owed {formatMoney(cents, currency)}
              </p>
            ))}
            {[...oweByCurrency.entries()].map(([currency, cents]) => (
              <p key={`owe-${currency}`} className="text-sm text-red-600">
                You owe {formatMoney(cents, currency)}
              </p>
            ))}
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {summaries.map((summary) => {
          const net = summary.netCents;
          return (
            <Link key={summary.id} href={`/groups/${summary.id}`}>
              <Card className="transition-colors hover:border-foreground/25">
                <CardContent className="flex items-center justify-between py-5">
                  <div>
                    <div className="font-medium">{summary.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {summary.memberCount}{" "}
                      {summary.memberCount === 1 ? "member" : "members"}
                    </div>
                  </div>
                  <div
                    className={`text-sm font-medium ${
                      net > 0
                        ? "text-emerald-600"
                        : net < 0
                          ? "text-red-600"
                          : "text-muted-foreground"
                    }`}
                  >
                    {net > 0
                      ? `gets ${formatMoney(net, summary.baseCurrency)}`
                      : net < 0
                        ? `owes ${formatMoney(-net, summary.baseCurrency)}`
                        : "settled up"}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {analytics && analytics.expenses.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-medium text-muted-foreground">
            Insights
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {summaries.map((summary) => (
              <Link
                key={summary.id}
                href={`/dashboard?group=${summary.id}`}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  summary.id === active.id
                    ? "border-foreground/30 bg-secondary"
                    : "text-muted-foreground hover:border-foreground/25"
                }`}
              >
                {summary.name}
              </Link>
            ))}
          </div>

          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-medium text-muted-foreground">
                Monthly spending ({active.baseCurrency})
              </h3>
              <TrendBars points={trend} currency={active.baseCurrency} />
            </div>
            <div>
              <h3 className="text-xs font-medium text-muted-foreground">
                By category
              </h3>
              <div className="mt-3">
                <CategoryDonut segments={segments} currency={active.baseCurrency} />
              </div>
            </div>
          </div>
        </section>
      )}

      {recentActivity.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-medium text-muted-foreground">
            Recent activity
          </h2>
          <ul className="mt-4 divide-y">
            {recentActivity.map((event) => (
              <li
                key={event.id}
                className="flex items-baseline justify-between gap-3 py-2"
              >
                <span className="min-w-0 truncate text-sm">
                  {activitySentence({
                    type: event.type,
                    actorName: event.actor.name,
                    detail: event.detail,
                  })}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {event.group.name} · {formatDay(event.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
