"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { createPayment } from "@/lib/actions/payments";
import { Button } from "@/components/ui/button";

export function SettleButton({
  groupId,
  toUserId,
  amountCents,
}: {
  groupId: string;
  toUserId: string;
  amountCents: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await createPayment({
            groupId,
            toUserId,
            amountCents,
          });
          if (result?.error) {
            toast.error(result.error);
            return;
          }
          toast.success("Payment recorded");
        })
      }
    >
      {pending ? "Recording…" : "Record payment"}
    </Button>
  );
}
