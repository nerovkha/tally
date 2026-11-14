"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createPayment } from "@/lib/actions/payments";
import { formatMoney, moneySymbol, parseAmountToCents } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Member = { id: string; name: string };

export function SettleDialog({
  groupId,
  members,
  currentUserId,
  currency,
}: {
  groupId: string;
  members: Member[];
  currentUserId: string;
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const [toUserId, setToUserId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [pending, startTransition] = useTransition();

  const others = members.filter((member) => member.id !== currentUserId);
  const toName = others.find((member) => member.id === toUserId)?.name;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setToUserId(null);
      setAmount("");
    }
  }

  function submit() {
    const cents = parseAmountToCents(amount);
    if (!toUserId) {
      toast.error("Pick who you paid");
      return;
    }
    if (cents === null || cents <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    startTransition(async () => {
      const result = await createPayment({
        groupId,
        toUserId,
        amountCents: cents,
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Payment recorded");
      handleOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Settle up</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Settle up</DialogTitle>
          <DialogDescription>
            Record a payment you made to another member in {currency}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paid-to">Paid to</Label>
            <Select value={toUserId ?? undefined} onValueChange={setToUserId}>
              <SelectTrigger id="paid-to" className="w-full">
                <SelectValue placeholder="Pick a member" />
              </SelectTrigger>
              <SelectContent>
                {others.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="settle-amount">Amount</Label>
            <Input
              id="settle-amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={moneySymbol(currency)}
            />
            {centsPreview(amount) !== null && toName && (
              <p className="text-sm text-muted-foreground">
                You paid {toName} {formatMoney(centsPreview(amount)!, currency)}
              </p>
            )}
          </div>

          <Button
            onClick={submit}
            disabled={pending || !toUserId}
            className="w-full"
          >
            {pending ? "Recording…" : "Record payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function centsPreview(amount: string): number | null {
  if (!amount) return null;
  return parseAmountToCents(amount);
}
