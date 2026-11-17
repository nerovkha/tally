"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createRecurringRule,
  deleteRecurringRule,
} from "@/lib/actions/recurring";
import { formatDay, formatMoney, parseAmountToCents } from "@/lib/format";
import { frequencyLabel, type Frequency } from "@/lib/recurring";
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
import { Separator } from "@/components/ui/separator";

type Rule = {
  id: string;
  description: string;
  amountCents: number;
  currency: string;
  frequency: string;
  nextDueAt: Date | string;
  createdByUser: { id: string; name: string };
};

function todayIsoDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function RecurringDialog({
  groupId,
  currency,
  rules,
}: {
  groupId: string;
  currency: string;
  rules: Rule[];
}) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [nextDueAt, setNextDueAt] = useState(todayIsoDate());
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setDescription("");
      setAmount("");
      setFrequency("monthly");
      setNextDueAt(todayIsoDate());
    }
  }

  function submit() {
    const cents = parseAmountToCents(amount);
    if (cents === null) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }

    startTransition(async () => {
      const result = await createRecurringRule({
        groupId,
        description: description.trim(),
        amountCents: cents,
        currency,
        frequency,
        nextDueAt,
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Recurring expense scheduled");
      handleOpenChange(false);
      router.refresh();
    });
  }

  function remove(rule: Rule) {
    startTransition(async () => {
      await deleteRecurringRule(rule.id, groupId);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Repeat className="size-4" />
          Recurring
          {rules.length > 0 && (
            <span className="ml-1 rounded-full bg-secondary px-1.5 text-xs">
              {rules.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recurring expenses</DialogTitle>
          <DialogDescription>
            Rent, subscriptions, weekly groceries — split equally between all
            members when they land
          </DialogDescription>
        </DialogHeader>

        {rules.length > 0 && (
          <ul className="space-y-2">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="flex items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {rule.description}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatMoney(rule.amountCents, rule.currency)} ·{" "}
                    {frequencyLabel(rule.frequency as Frequency)} · next{" "}
                    {formatDay(rule.nextDueAt)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-muted-foreground"
                  aria-label={`Stop ${rule.description}`}
                  disabled={pending}
                  onClick={() => remove(rule)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Separator />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recurring-description">Description</Label>
            <Input
              id="recurring-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Rent, Netflix…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="recurring-amount">Amount ({currency})</Label>
              <Input
                id="recurring-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recurring-frequency">Repeats</Label>
              <Select
                value={frequency}
                onValueChange={(value) => setFrequency(value as Frequency)}
              >
                <SelectTrigger id="recurring-frequency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recurring-next">First expense on</Label>
            <Input
              id="recurring-next"
              type="date"
              value={nextDueAt}
              onChange={(e) => setNextDueAt(e.target.value)}
            />
          </div>

          <Button onClick={submit} disabled={pending} className="w-full">
            {pending ? "Scheduling…" : "Schedule recurring expense"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
