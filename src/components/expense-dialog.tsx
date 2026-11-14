"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { createExpense } from "@/lib/actions/expenses";
import { getFxQuote } from "@/lib/actions/fx";
import {
  CATEGORIES,
  DEFAULT_CATEGORY,
  type CategorySlug,
} from "@/lib/categories";
import { CURRENCIES } from "@/lib/currencies";
import { convertCents } from "@/lib/fx";
import { formatMoney, moneySymbol, parseAmountToCents } from "@/lib/format";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Member = { id: string; name: string };

export function ExpenseDialog({
  groupId,
  members,
  currentUserId,
  baseCurrency,
}: {
  groupId: string;
  members: Member[];
  currentUserId: string;
  baseCurrency: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [ratePending, startRateTransition] = useTransition();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<CategorySlug>(DEFAULT_CATEGORY);
  const [currency, setCurrency] = useState(baseCurrency);
  const [fxRate, setFxRate] = useState("1");
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [selected, setSelected] = useState<string[]>(members.map((m) => m.id));
  const [values, setValues] = useState<Record<string, string>>({});

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setDescription("");
      setAmount("");
      setCategory(DEFAULT_CATEGORY);
      setCurrency(baseCurrency);
      setFxRate("1");
      setSplitType("equal");
      setSelected(members.map((m) => m.id));
      setValues({});
    }
  }

  function handleCurrencyChange(code: string) {
    setCurrency(code);
    if (code === baseCurrency) {
      setFxRate("1");
      return;
    }
    setFxRate("");
    startRateTransition(async () => {
      const quote = await getFxQuote(code, baseCurrency);
      if (quote.rate) {
        setFxRate(String(quote.rate));
      } else {
        toast.error(quote.error ?? "Could not load an exchange rate");
        setFxRate("1");
      }
    });
  }

  const rate = useMemo(() => {
    const parsed = Number(fxRate);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [fxRate]);

  const foreign = currency !== baseCurrency;

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

  const basePreview = useMemo(() => {
    const cents = parseAmountToCents(amount);
    if (cents === null || !foreign || rate === null) return null;
    return convertCents(cents, rate);
  }, [amount, foreign, rate]);

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
    if (foreign && rate === null) {
      toast.error("Enter a valid exchange rate");
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
        currency,
        fxRate: foreign ? (rate ?? undefined) : undefined,
        category,
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
            <Label htmlFor="expense-category">Category</Label>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value as CategorySlug)}
            >
              <SelectTrigger id="expense-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((entry) => (
                  <SelectItem key={entry.slug} value={entry.slug}>
                    {entry.emoji} {entry.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="24.50"
              />
              <Select
                value={currency}
                onValueChange={handleCurrencyChange}
                disabled={ratePending}
              >
                <SelectTrigger id="expense-currency" className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((entry) => (
                    <SelectItem key={entry.code} value={entry.code}>
                      {entry.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {foreign && (
              <div className="space-y-2 rounded-lg border p-3">
                <Label htmlFor="fx-rate">
                  Rate to {baseCurrency} (1 {currency} =)
                </Label>
                <Input
                  id="fx-rate"
                  inputMode="decimal"
                  value={fxRate}
                  onChange={(e) => setFxRate(e.target.value)}
                  placeholder="1.16"
                  disabled={ratePending}
                />
                {basePreview !== null && (
                  <p className="text-sm text-muted-foreground">
                    Counts as {formatMoney(basePreview, baseCurrency)} in group
                    balances
                  </p>
                )}
              </div>
            )}
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
                      placeholder={
                        splitType === "percent" ? "%" : moneySymbol(currency)
                      }
                    />
                  )}
                  {splitType === "equal" &&
                    preview?.ok &&
                    selected.includes(member.id) && (
                      <span className="text-sm text-muted-foreground">
                        {formatMoney(preview.amounts[member.id], currency)}
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
