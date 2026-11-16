import { sql as drizzleSql, type SQL } from "drizzle-orm";
import { sql as pgClient } from "@/db";

type GroupListener = (groupId: string) => void;

const listeners = new Set<GroupListener>();
let listening: Promise<void> | null = null;

async function ensureListening() {
  if (!listening) {
    listening = pgClient
      .listen("group_changed", (payload) => {
        for (const listener of listeners) {
          listener(payload);
        }
      })
      .then(() => undefined)
      .catch((error) => {
        listening = null;
        throw error;
      });
  }
  await listening;
}

/**
 * Register a callback for group change notifications. Returns an unsubscribe
 * function. The LISTEN connection is shared across the whole process.
 */
export async function subscribeGroup(
  listener: GroupListener,
): Promise<() => void> {
  await ensureListening();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Fire-and-forget notification that a group changed. Call this from inside a
 * transaction: Postgres delivers the notification only if the transaction
 * commits, so rolled-back mutations never wake anyone up.
 */
export function notifyGroupChanged(
  tx: { execute: (query: SQL) => Promise<unknown> },
  groupId: string,
) {
  return tx.execute(
    drizzleSql`select pg_notify('group_changed', ${groupId})`,
  );
}
