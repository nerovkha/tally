"use client";

import { useTransition } from "react";
import { toast } from "sonner";
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
            const result = await leaveGroup(groupId);
            if (result?.error) {
              toast.error(result.error);
            }
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
