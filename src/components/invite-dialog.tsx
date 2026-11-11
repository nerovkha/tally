"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createInvite } from "@/lib/actions/groups";
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

export function InviteDialog({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || url) return;

    startTransition(async () => {
      const result = await createInvite(groupId);
      if ("error" in result) {
        toast.error(result.error);
        setOpen(false);
        return;
      }
      setUrl(result.url);
    });
  }, [open, url, groupId]);

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success("invite link copied");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">invite</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>invite to group</DialogTitle>
          <DialogDescription>
            anyone with this link can join the group
          </DialogDescription>
        </DialogHeader>
        {pending || !url ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> creating invite link...
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="invite-url">invite link</Label>
            <div className="flex gap-2">
              <Input id="invite-url" readOnly value={url} />
              <Button onClick={copy}>copy</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
