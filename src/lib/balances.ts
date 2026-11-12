export type ExpenseLike = {
  paidById: string;
  amountCents: number;
  splits: { userId: string; amountCents: number }[];
};

export type PaymentLike = {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
};

/**
 * Net balance per member in cents. Positive means the group owes this
 * member money; negative means the member owes the group.
 */
export function computeNetBalances(
  memberIds: string[],
  expenses: ExpenseLike[],
  payments: PaymentLike[],
): Record<string, number> {
  const net = Object.fromEntries(memberIds.map((id) => [id, 0]));

  for (const expense of expenses) {
    if (net[expense.paidById] !== undefined) {
      net[expense.paidById] += expense.amountCents;
    }
    for (const split of expense.splits) {
      if (net[split.userId] !== undefined) {
        net[split.userId] -= split.amountCents;
      }
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
