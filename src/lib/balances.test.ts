import { describe, expect, it } from "vitest";
import { computeNetBalances, settlementTransfers } from "./balances";

describe("computeNetBalances", () => {
  it("credits the payer and debits the participants", () => {
    const net = computeNetBalances(
      ["alice", "bob"],
      [
        {
          paidById: "alice",
          amountCents: 3000,
          fxRate: 1,
          splits: [
            { userId: "alice", amountCents: 1500 },
            { userId: "bob", amountCents: 1500 },
          ],
        },
      ],
      [],
    );
    expect(net).toEqual({ alice: 1500, bob: -1500 });
  });

  it("sums across multiple expenses", () => {
    const net = computeNetBalances(
      ["alice", "bob", "carol"],
      [
        {
          paidById: "alice",
          amountCents: 3000,
          fxRate: 1,
          splits: [
            { userId: "alice", amountCents: 1000 },
            { userId: "bob", amountCents: 1000 },
            { userId: "carol", amountCents: 1000 },
          ],
        },
        {
          paidById: "carol",
          amountCents: 1500,
          fxRate: 1,
          splits: [
            { userId: "alice", amountCents: 750 },
            { userId: "carol", amountCents: 750 },
          ],
        },
      ],
      [],
    );
    expect(net).toEqual({ alice: 1250, bob: -1000, carol: -250 });
  });

  it("offsets balances with payments", () => {
    const net = computeNetBalances(
      ["alice", "bob"],
      [
        {
          paidById: "alice",
          amountCents: 2000,
          fxRate: 1,
          splits: [
            { userId: "alice", amountCents: 1000 },
            { userId: "bob", amountCents: 1000 },
          ],
        },
      ],
      [{ fromUserId: "bob", toUserId: "alice", amountCents: 1000 }],
    );
    expect(net).toEqual({ alice: 0, bob: 0 });
  });

  it("converts foreign expenses at the captured rate", () => {
    const net = computeNetBalances(
      ["alice", "bob"],
      [
        {
          paidById: "alice",
          amountCents: 2000,
          fxRate: 1.16,
          splits: [
            { userId: "alice", amountCents: 1000 },
            { userId: "bob", amountCents: 1000 },
          ],
        },
      ],
      [],
    );
    expect(net).toEqual({ alice: 1160, bob: -1160 });
  });

  it("absorbs conversion rounding in the payer so balances net to zero", () => {
    // 333 cents * 1.16 = 386.28 → each participant owes 386, total 772
    const net = computeNetBalances(
      ["alice", "bob"],
      [
        {
          paidById: "alice",
          amountCents: 666,
          fxRate: 1.16,
          splits: [
            { userId: "alice", amountCents: 333 },
            { userId: "bob", amountCents: 333 },
          ],
        },
      ],
      [],
    );
    expect(net).toEqual({ alice: 386, bob: -386 });
    expect(Object.values(net).reduce((sum, cents) => sum + cents, 0)).toBe(0);
  });

  it("nets to zero across mixed-currency expenses and payments", () => {
    const net = computeNetBalances(
      ["alice", "bob", "carol"],
      [
        {
          paidById: "alice",
          amountCents: 9901,
          fxRate: 1.0707,
          splits: [
            { userId: "alice", amountCents: 3301 },
            { userId: "bob", amountCents: 3300 },
            { userId: "carol", amountCents: 3300 },
          ],
        },
        {
          paidById: "carol",
          amountCents: 5000,
          fxRate: 0.8455,
          splits: [
            { userId: "bob", amountCents: 2500 },
            { userId: "carol", amountCents: 2500 },
          ],
        },
      ],
      [{ fromUserId: "bob", toUserId: "alice", amountCents: 2000 }],
    );
    const total = Object.values(net).reduce((sum, cents) => sum + cents, 0);
    expect(total).toBe(0);
  });
});

describe("settlementTransfers", () => {
  it("settles a single debtor and creditor", () => {
    expect(
      settlementTransfers({ alice: 1500, bob: -1500 }),
    ).toEqual([{ fromUserId: "bob", toUserId: "alice", amountCents: 1500 }]);
  });

  it("routes multiple debtors to one creditor", () => {
    expect(
      settlementTransfers({ alice: 3000, bob: -1000, carol: -2000 }),
    ).toEqual([
      { fromUserId: "carol", toUserId: "alice", amountCents: 2000 },
      { fromUserId: "bob", toUserId: "alice", amountCents: 1000 },
    ]);
  });

  it("returns nothing when everyone is even", () => {
    expect(settlementTransfers({ alice: 0, bob: 0 })).toEqual([]);
  });

  it("chains transfers when debtor and creditor sizes differ", () => {
    expect(
      settlementTransfers({ alice: 500, bob: 500, carol: -1000 }),
    ).toEqual([
      { fromUserId: "carol", toUserId: "alice", amountCents: 500 },
      { fromUserId: "carol", toUserId: "bob", amountCents: 500 },
    ]);
  });
});
