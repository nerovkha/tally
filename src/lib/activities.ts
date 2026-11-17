export const ACTIVITY_TYPES = [
  "group_created",
  "group_renamed",
  "member_joined",
  "member_left",
  "member_removed",
  "expense_created",
  "expense_deleted",
  "payment_recorded",
  "payment_deleted",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export function isActivityType(value: string): value is ActivityType {
  return (ACTIVITY_TYPES as readonly string[]).includes(value);
}

/**
 * Build the timeline sentence for an activity row. The detail string is a
 * snapshot written when the event happened, so the sentence stays stable
 * even if the underlying expense is later edited or removed.
 */
export function activitySentence(input: {
  type: string;
  actorName: string;
  detail?: string | null;
}): string {
  const { actorName, detail } = input;

  switch (input.type) {
    case "group_created":
      return `${actorName} created the group`;
    case "group_renamed":
      return detail
        ? `${actorName} renamed the group to ${detail}`
        : `${actorName} renamed the group`;
    case "member_joined":
      return `${actorName} joined the group`;
    case "member_left":
      return `${actorName} left the group`;
    case "member_removed":
      return detail ? `${actorName} removed ${detail}` : `${actorName} removed a member`;
    case "expense_created":
      return detail ? `${actorName} added ${detail}` : `${actorName} added an expense`;
    case "expense_deleted":
      return detail
        ? `${actorName} removed ${detail}`
        : `${actorName} removed an expense`;
    case "payment_recorded":
      return detail ? `${actorName} ${detail}` : `${actorName} recorded a payment`;
    case "payment_deleted":
      return detail
        ? `${actorName} removed ${detail}`
        : `${actorName} removed a payment`;
    default:
      return `${actorName} did something`;
  }
}
