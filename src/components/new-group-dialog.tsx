"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createGroup, type GroupFormState } from "@/lib/actions/groups";
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
            <Label htmlFor="name">Group name</Label>
            <Input id="name" name="name" placeholder="Flat 4B, Iceland trip…" />
            {state.error && (
              <p className="text-sm text-red-600" role="alert">
                {state.error}
              </p>
            )}
          </div>
          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}
