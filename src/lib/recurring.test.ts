import { describe, expect, it } from "vitest";
import { catchUpPlan, dueRules, isFrequency, nextOccurrence } from "./recurring";

describe("nextOccurrence", () => {
  it("adds a week for weekly rules", () => {
    const from = new Date("2026-11-16T09:00:00Z");
    expect(nextOccurrence(from, "weekly").toISOString()).toBe(
      "2026-11-23T09:00:00.000Z",
    );
  });

  it("moves to the same day next month", () => {
    const from = new Date(2026, 10, 5, 9, 0, 0);
    const next = nextOccurrence(from, "monthly");
    expect(next.getMonth()).toBe(11);
    expect(next.getDate()).toBe(5);
  });

  it("clamps to the end of shorter months", () => {
    const from = new Date(2026, 0, 31, 9, 0, 0);
    const next = nextOccurrence(from, "monthly");
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(28);
  });

  it("rolls over the year", () => {
    const from = new Date(2026, 11, 15, 9, 0, 0);
    const next = nextOccurrence(from, "monthly");
    expect(next.getFullYear()).toBe(2027);
    expect(next.getMonth()).toBe(0);
  });
});

describe("dueRules", () => {
  const now = new Date("2026-11-16T12:00:00");

  it("selects active rules that are due", () => {
    const rules = [
      { id: "a", active: true, nextDueAt: new Date("2026-11-16T08:00:00") },
      { id: "b", active: true, nextDueAt: new Date("2026-11-17T00:00:00") },
      { id: "c", active: false, nextDueAt: new Date("2026-11-01T00:00:00") },
    ];
    expect(dueRules(rules, now).map((rule) => rule.id)).toEqual(["a"]);
  });
});

describe("catchUpPlan", () => {
  it("returns every missed occurrence, oldest first", () => {
    const plan = catchUpPlan(
      new Date(2026, 7, 20, 9, 0, 0),
      new Date(2026, 10, 16, 12, 0, 0),
      "monthly",
    );
    expect(plan.map((date) => date.toISOString().slice(0, 10))).toEqual([
      "2026-08-20",
      "2026-09-20",
      "2026-10-20",
    ]);
  });

  it("returns nothing when the next occurrence is in the future", () => {
    expect(
      catchUpPlan(
        new Date(2026, 10, 20, 9, 0, 0),
        new Date(2026, 10, 16, 12, 0, 0),
        "monthly",
      ),
    ).toEqual([]);
  });

  it("caps runaway catch-ups", () => {
    const plan = catchUpPlan(
      new Date(2020, 0, 1, 9, 0, 0),
      new Date(2026, 10, 16, 12, 0, 0),
      "monthly",
      12,
    );
    expect(plan).toHaveLength(12);
  });

  it("walks weekly occurrences", () => {
    const plan = catchUpPlan(
      new Date(2026, 10, 2, 9, 0, 0),
      new Date(2026, 10, 16, 9, 0, 0),
      "weekly",
    );
    expect(plan).toHaveLength(3);
  });
});

describe("isFrequency", () => {
  it("validates the vocabulary", () => {
    expect(isFrequency("weekly")).toBe(true);
    expect(isFrequency("monthly")).toBe(true);
    expect(isFrequency("daily")).toBe(false);
  });
});
