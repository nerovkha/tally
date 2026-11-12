"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { createExpense } from "@/lib/actions/expenses";
import { formatMoney, parseAmountToCents } from "@/lib/format";
import { splitAmounts, type SplitType } from "@/lib/splits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Member = { id: string; name: string };

export function ExpenseDialog({
  groupId,
  members,
  currentUserId,
}: {
  groupId: string;
  members: Member[];
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [selected, setSelected] = useState<string[]>(members.map((m) => m.id));
  const [values, setValues] = useState<Record<string, string>>({});

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setDescription("");
      setAmount("");
      setSplitType("equal");
      setSelected(members.map((m) => m.id));
      setValues({});
    }
  }

  const preview = useMemo(() => {
    const cents = parseAmountToCents(amount);
    if (cents === null) return null;
    const numeric = Object.fromEntries(
      selected.map((id) => {
        const raw = values[id];
        if (raw === undefined || raw === "") return [id, 0];
        return splitType === "percent"
          ? [id, Number(raw)]
          : [id, parseAmountToCents(raw) ?? 0];
      }),
    );
    return splitAmounts(cents, splitType, selected, numeric);
  }, [amount, splitType, selected, values]);

  function toggle(id: string, checked: boolean) {
    setSelected((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id),
    );
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
    if (!preview || !preview.ok) {
      toast.error(preview && !preview.ok ? preview.error : "Invalid split");
      return;
    }

    const numericValues = Object.fromEntries(
      selected.map((id) => {
        const raw = values[id];
        if (raw === undefined || raw === "") return [id, 0];
        return splitType === "percent"
          ? [id, Number(raw)]
          : [id, parseAmountToCents(raw) ?? 0];
      }),
    );

    startTransition(async () => {
      const result = await createExpense({
        groupId,
        description: description.trim(),
        amountCents: cents,
        splitType,
        participantIds: selected,
        values: numericValues,
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Expense added");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Add expense</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add expense</DialogTitle>
          <DialogDescription>
            You paid — pick who shares the cost and how
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Groceries, taxi, dinner…"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="24.50"
            />
          </div>

          <div className="space-y-2">
            <Label>Split by</Label>
            <RadioGroup
              value={splitType}
              onValueChange={(value) => setSplitType(value as SplitType)}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="equal" id="equal" />
                <Label htmlFor="equal">Equally</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="exact" id="exact" />
                <Label htmlFor="exact">Exact amounts</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="percent" id="percent" />
                <Label htmlFor="percent">Percentages</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Participants</Label>
            <ul className="space-y-2">
              {members.map((member) => (
                <li key={member.id} className="flex items-center gap-3">
                  <Checkbox
                    id={`member-${member.id}`}
                    checked={selected.includes(member.id)}
                    onCheckedChange={(checked) =>
                      toggle(member.id, checked === true)
                    }
                  />
                  <Label
                    htmlFor={`member-${member.id}`}
                    className="flex-1 font-normal"
                  >
                    {member.name}
                    {member.id === currentUserId ? " (you)" : ""}
                  </Label>
                  {splitType !== "equal" && selected.includes(member.id) && (
                    <Input
                      className="h-8 w-24"
                      inputMode={splitType === "percent" ? "numeric" : "decimal"}
                      value={values[member.id] ?? ""}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          [member.id]: e.target.value,
                        }))
                      }
                      placeholder={splitType === "percent" ? "%" : "€"}
                    />
                  )}
                  {splitType === "equal" &&
                    preview?.ok &&
                    selected.includes(member.id) && (
                      <span className="text-sm text-muted-foreground">
                        {formatMoney(preview.amounts[member.id])}
                      </span>
                    )}
                </li>
              ))}
            </ul>
          </div>

          {preview && !preview.ok && (
            <p className="text-sm text-red-600">{preview.error}</p>
          )}

          <Button onClick={submit} disabled={pending} className="w-full">
            {pending ? "Adding…" : "Add expense"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
