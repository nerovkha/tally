"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createComment, deleteComment } from "@/lib/actions/comments";
import { formatDay } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type Comment = {
  id: string;
  body: string;
  createdAt: Date | string;
  user: { id: string; name: string };
};

export function CommentButton({
  expenseId,
  expenseLabel,
  comments,
  currentUserId,
}: {
  expenseId: string;
  expenseLabel: string;
  comments: Comment[];
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setBody("");
  }

  function submit() {
    if (!body.trim()) {
      toast.error("Write a comment first");
      return;
    }
    startTransition(async () => {
      const result = await createComment({ expenseId, body: body.trim() });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  function remove(commentId: string) {
    startTransition(async () => {
      await deleteComment(commentId);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          aria-label={`Comments on ${expenseLabel}`}
        >
          <MessageCircle className="size-4" />
          {comments.length > 0 && (
            <span className="text-xs font-normal">{comments.length}</span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
          <DialogDescription>On “{expenseLabel}”</DialogDescription>
        </DialogHeader>

        <ul className="max-h-64 space-y-3 overflow-y-auto">
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No comments yet — start the conversation
            </p>
          )}
          {comments.map((comment) => (
            <li key={comment.id} className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm">
                  <span className="font-medium">{comment.user.name}</span>{" "}
                  {comment.body}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDay(comment.createdAt)}
                </div>
              </div>
              {comment.user.id === currentUserId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 text-muted-foreground"
                  aria-label="Delete comment"
                  disabled={pending}
                  onClick={() => remove(comment.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>

        <div className="flex items-end gap-2">
          <Textarea
            id={`comment-body-${expenseId}`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment…"
            rows={2}
            className="flex-1"
          />
          <Button onClick={submit} disabled={pending}>
            {pending ? "Posting…" : "Post"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
