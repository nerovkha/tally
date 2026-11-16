export type Frequency = "weekly" | "monthly";

const FREQUENCIES: readonly Frequency[] = ["weekly", "monthly"];

export function isFrequency(value: string): value is Frequency {
  return (FREQUENCIES as readonly string[]).includes(value);
}

export function frequencyLabel(frequency: Frequency): string {
  return frequency === "weekly" ? "Weekly" : "Monthly";
}

/**
 * Next occurrence after `from` for the given frequency. Monthly dates clamp
 * to the end of shorter months (Jan 31 → Feb 28).
 */
export function nextOccurrence(from: Date, frequency: Frequency): Date {
  if (frequency === "weekly") {
    const next = new Date(from);
    next.setDate(next.getDate() + 7);
    return next;
  }

  const day = from.getDate();
  const next = new Date(from.getFullYear(), from.getMonth() + 1, 1);
  const daysInMonth = new Date(
    next.getFullYear(),
    next.getMonth() + 1,
    0,
  ).getDate();
  next.setDate(Math.min(day, daysInMonth));
  next.setHours(from.getHours(), from.getMinutes(), from.getSeconds(), 0);
  return next;
}

export type RecurringLike = {
  active: boolean;
  nextDueAt: Date | string;
};

export function dueRules<T extends RecurringLike>(rules: T[], now: Date): T[] {
  return rules.filter(
    (rule) =>
      rule.active && new Date(rule.nextDueAt).getTime() <= now.getTime(),
  );
}

/**
 * All occurrences between `from` (inclusive) and `now` (inclusive), oldest
 * first, capped so a long-lapsed rule cannot explode into endless catch-up
 * work in a single run.
 */
export function catchUpPlan(
  from: Date,
  now: Date,
  frequency: Frequency,
  max = 12,
): Date[] {
  const due: Date[] = [];
  let cursor = new Date(from);
  while (cursor.getTime() <= now.getTime() && due.length < max) {
    due.push(new Date(cursor));
    cursor = nextOccurrence(cursor, frequency);
  }
  return due;
}
