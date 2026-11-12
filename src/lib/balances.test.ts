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
          splits: [
            { userId: "alice", amountCents: 1000 },
            { userId: "bob", amountCents: 1000 },
            { userId: "carol", amountCents: 1000 },
          ],
        },
        {
          paidById: "carol",
          amountCents: 1500,
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
