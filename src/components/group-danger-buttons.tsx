"use client";

import { useTransition } from "react";
import { deleteGroup, leaveGroup } from "@/lib/actions/groups";
import { Button } from "@/components/ui/button";

export function LeaveGroupButton({ groupId }: { groupId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => {
        if (confirm("Leave this group?")) {
          startTransition(async () => {
            await leaveGroup(groupId);
          });
        }
      }}
    >
      {pending ? "Leaving…" : "Leave"}
    </Button>
  );
}

export function DeleteGroupButton({ groupId }: { groupId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this group and all its expenses?")) {
          startTransition(async () => {
            await deleteGroup(groupId);
          });
        }
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
