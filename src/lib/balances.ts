export type ExpenseLike = {
  paidById: string;
  amountCents: number;
  // Multiplier from the expense currency to the group base currency
  fxRate: number;
  splits: { userId: string; amountCents: number }[];
};

export type PaymentLike = {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
};

/**
 * Net balance per member in base-currency cents. Positive means the group
 * owes this member money; negative means the member owes the group.
 *
 * Each expense's splits are converted to the base currency with the rate
 * captured when the expense was created. The payer is credited with the
 * sum of the converted splits, so per-expense rounding is absorbed by the
 * payer and every expense still nets out to exactly zero.
 */
export function computeNetBalances(
  memberIds: string[],
  expenses: ExpenseLike[],
  payments: PaymentLike[],
): Record<string, number> {
  const net = Object.fromEntries(memberIds.map((id) => [id, 0]));

  for (const expense of expenses) {
    let convertedTotal = 0;
    for (const split of expense.splits) {
      const converted = Math.round(split.amountCents * expense.fxRate);
      convertedTotal += converted;
      if (net[split.userId] !== undefined) {
        net[split.userId] -= converted;
      }
    }
    if (net[expense.paidById] !== undefined) {
      net[expense.paidById] += convertedTotal;
    }
  }

  for (const payment of payments) {
    if (net[payment.fromUserId] !== undefined) {
      net[payment.fromUserId] += payment.amountCents;
    }
    if (net[payment.toUserId] !== undefined) {
      net[payment.toUserId] -= payment.amountCents;
    }
  }

  return net;
}

/**
 * Minimal set of transfers that settles all balances (greedy: match the
 * largest debtor with the largest creditor until everyone is even).
 */
export function settlementTransfers(net: Record<string, number>): {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
}[] {
  const debtors = Object.entries(net)
    .filter(([, cents]) => cents < 0)
    .map(([userId, cents]) => ({ userId, cents: -cents }))
    .sort((a, b) => b.cents - a.cents);

  const creditors = Object.entries(net)
    .filter(([, cents]) => cents > 0)
    .map(([userId, cents]) => ({ userId, cents }))
    .sort((a, b) => b.cents - a.cents);

  const transfers: {
    fromUserId: string;
    toUserId: string;
    amountCents: number;
  }[] = [];

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.cents, creditor.cents);

    if (amount > 0) {
      transfers.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amountCents: amount,
      });
    }

    debtor.cents -= amount;
    creditor.cents -= amount;

    if (debtor.cents === 0) debtorIndex += 1;
    if (creditor.cents === 0) creditorIndex += 1;
  }

  return transfers;
}
