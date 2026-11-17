"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Settings, ShieldCheck, Trash2, UserMinus } from "lucide-react";
import { toast } from "sonner";
import {
  removeMember,
  renameGroup,
  setMemberRole,
} from "@/lib/actions/groups";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Member = {
  id: string;
  name: string;
  role: string;
};

export function GroupSettingsDialog({
  groupId,
  name,
  members,
  currentUserId,
}: {
  groupId: string;
  name: string;
  members: Member[];
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState(name);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function rename() {
    startTransition(async () => {
      const result = await renameGroup(groupId, newName);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Group renamed");
      router.refresh();
    });
  }

  function changeRole(memberId: string, role: "admin" | "member") {
    startTransition(async () => {
      const result = await setMemberRole(groupId, memberId, role);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function remove(member: Member) {
    if (!confirm(`Remove ${member.name} from this group?`)) return;
    startTransition(async () => {
      const result = await removeMember(groupId, member.id);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${member.name} removed`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" aria-label="Group settings">
          <Settings className="size-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Group settings</DialogTitle>
          <DialogDescription>
            Admins can rename the group and manage members
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="rename-group">Group name</Label>
          <div className="flex gap-2">
            <Input
              id="rename-group"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Button onClick={rename} disabled={pending || newName === name}>
              Rename
            </Button>
          </div>
        </div>

        <Separator />

        <ul className="space-y-2">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between gap-2 rounded-lg border p-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm">{member.name}</span>
                {member.id === currentUserId && (
                  <Badge variant="secondary">You</Badge>
                )}
                {member.role === "admin" && (
                  <Badge variant="outline">
                    <ShieldCheck className="mr-1 size-3" />
                    Admin
                  </Badge>
                )}
              </div>
              {member.id !== currentUserId && (
                <div className="flex shrink-0 gap-1">
                  {member.role === "admin" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => changeRole(member.id, "member")}
                    >
                      Demote
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => changeRole(member.id, "admin")}
                    >
                      Make admin
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    aria-label={`Remove ${member.name}`}
                    disabled={pending}
                    onClick={() => remove(member)}
                  >
                    {member.role === "admin" ? (
                      <UserMinus className="size-4" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
