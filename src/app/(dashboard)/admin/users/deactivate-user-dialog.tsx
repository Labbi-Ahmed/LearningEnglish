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

export function DeactivateUserDialog({ target, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const deactivate = useMutation({
    mutationFn: async () => {
      const trimmed = reason.trim();
      const res = await fetch(`/api/admin/users/${target.id}/deactivate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(trimmed ? { reason: trimmed } : {}),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "deactivate_failed");
      }
    },
    onSuccess,
    onError: (err) => setError((err as Error).message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Deactivate user</h3>
          <p className="text-sm text-muted-foreground">
            Blocks sign-in and ends the user&apos;s active sessions. All data is preserved; the user
            can be reactivated at any time.
          </p>
          <p className="text-xs text-muted-foreground mt-1 font-mono">{target.email ?? target.id}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">Reason (optional)</Label>
          <Input
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Internal note"
            maxLength={500}
          />
        </div>

        {error ? <p className="text-sm text-destructive">Error: {error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={deactivate.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={deactivate.isPending}
            onClick={() => deactivate.mutate()}
          >
            {deactivate.isPending ? "Deactivating…" : "Deactivate"}
          </Button>
        </div>
      </div>
    </div>
  );
}
