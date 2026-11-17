import { describe, expect, it } from "vitest";
import { ACTIVITY_TYPES, activitySentence, isActivityType } from "./activities";

describe("activitySentence", () => {
  it("describes group lifecycle events", () => {
    expect(
      activitySentence({ type: "group_created", actorName: "Alice" }),
    ).toBe("Alice created the group");
    expect(
      activitySentence({ type: "member_joined", actorName: "Bob" }),
    ).toBe("Bob joined the group");
    expect(
      activitySentence({ type: "member_left", actorName: "Bob" }),
    ).toBe("Bob left the group");
    expect(
      activitySentence({ type: "group_renamed", actorName: "Alice", detail: "“Flat 4B”" }),
    ).toBe("Alice renamed the group to “Flat 4B”");
    expect(
      activitySentence({ type: "member_removed", actorName: "Alice", detail: "Bob" }),
    ).toBe("Alice removed Bob");
  });

  it("weaves the detail snapshot into expense events", () => {
    expect(
      activitySentence({
        type: "expense_created",
        actorName: "Alice",
        detail: "“Groceries” · €30.50",
      }),
    ).toBe("Alice added “Groceries” · €30.50");
    expect(
      activitySentence({
        type: "expense_deleted",
        actorName: "Alice",
        detail: "“Groceries” · €30.50",
      }),
    ).toBe("Alice removed “Groceries” · €30.50");
  });

  it("reads naturally for payment events", () => {
    expect(
      activitySentence({
        type: "payment_recorded",
        actorName: "Bob",
        detail: "paid Alice €15.25",
      }),
    ).toBe("Bob paid Alice €15.25");
    expect(
      activitySentence({
        type: "payment_deleted",
        actorName: "Bob",
        detail: "the payment to Alice",
      }),
    ).toBe("Bob removed the payment to Alice");
  });

  it("falls back gracefully when detail is missing", () => {
    expect(
      activitySentence({ type: "expense_created", actorName: "Alice" }),
    ).toBe("Alice added an expense");
    expect(
      activitySentence({ type: "payment_recorded", actorName: "Bob" }),
    ).toBe("Bob recorded a payment");
  });

  it("handles unknown types without throwing", () => {
    expect(activitySentence({ type: "odd_future_event", actorName: "Zoe" })).toBe(
      "Zoe did something",
    );
  });
});

describe("isActivityType", () => {
  it("validates against the known vocabulary", () => {
    expect(isActivityType("expense_created")).toBe(true);
    expect(isActivityType("nope")).toBe(false);
    expect(ACTIVITY_TYPES).toContain("group_created");
  });
});
