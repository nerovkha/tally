export type SplitType = "equal" | "exact" | "percent";

export type SplitResult = Record<string, number>;

export type SplitOutcome =
  | { ok: true; amounts: SplitResult }
  | { ok: false; error: string };

/**
 * Split a total in cents across participants.
 * - equal: even split, remainder cents go to the first participants
 * - exact: values hold each share in cents and must sum to the total
 * - percent: values hold integer percentages summing to 100; cents are
 *   allocated by largest fractional remainder
 */
export function splitAmounts(
  totalCents: number,
  splitType: SplitType,
  participantIds: string[],
  values: Record<string, number> = {},
): SplitOutcome {
  if (!Number.isInteger(totalCents) || totalCents <= 0) {
    return { ok: false, error: "Enter a valid amount" };
  }
  if (participantIds.length === 0) {
    return { ok: false, error: "Select at least one participant" };
  }
  if (new Set(participantIds).size !== participantIds.length) {
    return { ok: false, error: "Duplicate participant" };
  }

  if (splitType === "equal") {
    const base = Math.floor(totalCents / participantIds.length);
    let remainder = totalCents - base * participantIds.length;
    const result: SplitResult = {};
    for (const id of participantIds) {
      result[id] = base + (remainder > 0 ? 1 : 0);
      remainder -= 1;
    }
    return { ok: true, amounts: result };
  }

  if (splitType === "exact") {
    const result: SplitResult = {};
    let sum = 0;
    for (const id of participantIds) {
      const amount = values[id];
      if (!Number.isInteger(amount) || amount < 0) {
        return { ok: false, error: "Enter every share as a valid amount" };
      }
      result[id] = amount;
      sum += amount;
    }
    if (sum !== totalCents) {
      return { ok: false, error: "Shares must add up to the total" };
    }
    return { ok: true, amounts: result };
  }

  const totalPercent = participantIds.reduce(
    (sum, id) => sum + (values[id] ?? 0),
    0,
  );
  if (totalPercent !== 100) {
    return { ok: false, error: "Percentages must add up to 100" };
  }

  const result: SplitResult = {};
  let allocated = 0;
  const fractional: { id: string; frac: number }[] = [];

  for (const id of participantIds) {
    const exact = (totalCents * values[id]) / 100;
    const floor = Math.floor(exact);
    result[id] = floor;
    allocated += floor;
    fractional.push({ id, frac: exact - floor });
  }

  let remainder = totalCents - allocated;
  fractional.sort((a, b) => b.frac - a.frac);
  for (const { id } of fractional) {
    if (remainder <= 0) break;
    result[id] += 1;
    remainder -= 1;
  }

  return { ok: true, amounts: result };
}
