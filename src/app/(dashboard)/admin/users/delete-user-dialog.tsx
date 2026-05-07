"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminUserRow } from "@/lib/admin/list-users";

type Props = {
  target: AdminUserRow;
  onClose: () => void;
  onSuccess: () => void;
};

export function DeleteUserDialog({ target, onClose, onSuccess }: Props) {
  const [confirm, setConfirm] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const expected = target.email ?? "";
  const matches = expected.length > 0 && confirm === expected;
  const reasonValid = reason.trim().length > 0;

  const del = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/users/${target.id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "delete_failed");
      }
    },
    onSuccess,
    onError: (err) => setError((err as Error).message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Hard-delete user</h3>
          <p className="text-sm text-muted-foreground">
            This permanently removes the account and every per-user record (saved words, sessions,
            progress, recordings, AI history). The shared word cache is preserved. This cannot be
            undone.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">Reason (required)</Label>
          <Input
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this account being deleted?"
            maxLength={500}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">
            Type <span className="font-mono text-xs">{expected || "(unknown email)"}</span> to confirm
          </Label>
          <Input
            id="confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="off"
          />
        </div>

        {error ? <p className="text-sm text-destructive">Error: {error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={del.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!matches || !reasonValid || del.isPending}
            onClick={() => del.mutate()}
          >
            {del.isPending ? "Deleting…" : "Delete user"}
          </Button>
        </div>
      </div>
    </div>
  );
}
