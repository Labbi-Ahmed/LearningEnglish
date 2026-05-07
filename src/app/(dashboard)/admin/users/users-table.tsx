"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { AdminUserListResult, AdminUserRow } from "@/lib/admin/list-users";
import { DeleteUserDialog } from "./delete-user-dialog";
import { DeactivateUserDialog } from "./deactivate-user-dialog";

type Props = {
  initial: AdminUserListResult;
  currentUserId: string;
  initialQuery: string;
};

export function AdminUsersTable({ initial, currentUserId, initialQuery }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery);
  const [page, setPage] = useState(initial.page);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<AdminUserRow | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const queryKey = useMemo(() => ["admin-users", debounced, page] as const, [debounced, page]);
  const { data, isFetching } = useQuery<AdminUserListResult>({
    queryKey,
    initialData: debounced === initialQuery && page === initial.page ? initial : undefined,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debounced) params.set("q", debounced);
      params.set("page", String(page));
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error("list_failed");
      return res.json();
    },
  });

  const reactivate = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}/reactivate`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "reactivate_failed");
      }
    },
    onSuccess: () => {
      setFlash("User reactivated.");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) => setFlash(`Error: ${(err as Error).message}`),
  });

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebounced(search.trim());
    setPage(1);
  };

  const list = data ?? initial;
  const rows = list.users;

  return (
    <div className="space-y-4">
      <form onSubmit={onSearchSubmit} className="flex items-center gap-2">
        <Input
          type="search"
          placeholder="Search by email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button type="submit" variant="secondary" size="sm">Search</Button>
        {isFetching ? <span className="text-xs text-muted-foreground">loading…</span> : null}
      </form>

      {flash ? (
        <div className="rounded border bg-muted px-3 py-2 text-sm">{flash}</div>
      ) : null}

      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Tier</th>
              <th className="px-3 py-2 font-medium">Level</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Joined</th>
              <th className="px-3 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  No users.
                </td>
              </tr>
            ) : null}
            {rows.map((row) => {
              const isSelf = row.id === currentUserId;
              return (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{row.email ?? "—"}</td>
                  <td className="px-3 py-2">{row.display_name ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Badge variant={row.tier === "author" ? "default" : "secondary"}>{row.tier}</Badge>
                  </td>
                  <td className="px-3 py-2 uppercase">{row.level ?? "—"}</td>
                  <td className="px-3 py-2">
                    {row.is_active ? (
                      <Badge variant="secondary">active</Badge>
                    ) : (
                      <Badge variant="destructive">suspended</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {row.created_at ? new Date(row.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      {row.is_active ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isSelf}
                          onClick={() => setDeactivateTarget(row)}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={reactivate.isPending}
                          onClick={() => reactivate.mutate(row.id)}
                        >
                          Reactivate
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isSelf}
                        onClick={() => setDeleteTarget(row)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Page {list.page} of {list.totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={list.page <= 1 || isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={list.page >= list.totalPages || isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {deleteTarget ? (
        <DeleteUserDialog
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onSuccess={() => {
            setDeleteTarget(null);
            setFlash(`Deleted ${deleteTarget.email ?? deleteTarget.id}.`);
            qc.invalidateQueries({ queryKey: ["admin-users"] });
          }}
        />
      ) : null}
      {deactivateTarget ? (
        <DeactivateUserDialog
          target={deactivateTarget}
          onClose={() => setDeactivateTarget(null)}
          onSuccess={() => {
            setDeactivateTarget(null);
            setFlash(`Deactivated ${deactivateTarget.email ?? deactivateTarget.id}.`);
            qc.invalidateQueries({ queryKey: ["admin-users"] });
          }}
        />
      ) : null}
    </div>
  );
}
