"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deletePayment } from "@/lib/actions/payments";
import { Button } from "@/components/ui/button";

export function DeletePaymentButton({ paymentId }: { paymentId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      aria-label="Delete payment"
      onClick={() => {
        if (confirm("Delete this payment?")) {
          startTransition(async () => {
            await deletePayment(paymentId);
          });
        }
      }}
    >
      <Trash2 className="size-4 text-muted-foreground" />
    </Button>
  );
}
