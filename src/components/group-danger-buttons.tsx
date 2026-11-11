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
        if (confirm("leave this group?")) {
          startTransition(async () => {
            await leaveGroup(groupId);
          });
        }
      }}
    >
      {pending ? "leaving..." : "leave"}
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
        if (confirm("delete this group with all its expenses?")) {
          startTransition(async () => {
            await deleteGroup(groupId);
          });
        }
      }}
    >
      {pending ? "deleting..." : "delete"}
    </Button>
  );
}
