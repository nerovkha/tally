"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Subscribes to server-sent events for the group and refreshes the page
 * data whenever another member changes something.
 */
export function GroupLiveRefresh({ groupId }: { groupId: string }) {
  const router = useRouter();

  useEffect(() => {
    const source = new EventSource(`/api/groups/${groupId}/events`);

    const onChanged = () => router.refresh();
    source.addEventListener("changed", onChanged);

    return () => {
      source.removeEventListener("changed", onChanged);
      source.close();
    };
  }, [groupId, router]);

  return null;
}
