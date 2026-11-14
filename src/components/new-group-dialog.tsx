"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createGroup, type GroupFormState } from "@/lib/actions/groups";
import { CURRENCIES } from "@/lib/currencies";
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

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Creating…" : "Create group"}
    </Button>
  );
}

export function NewGroupDialog() {
  const [state, action] = useActionState<GroupFormState, FormData>(
    createGroup,
    {},
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>New group</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New group</DialogTitle>
          <DialogDescription>
            Create a group, then invite people with a link
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group name</Label>
            <Input
              id="group-name"
              name="name"
              placeholder="Flat 4B, Iceland trip…"
            />
            {state.error && (
              <p className="text-sm text-red-600" role="alert">
                {state.error}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-currency">Base currency</Label>
            <Select name="currency" defaultValue="EUR">
              <SelectTrigger id="group-currency" className="w-full">
                <SelectValue placeholder="Pick a currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.code} — {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Balances are settled in this currency
            </p>
          </div>
          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}
