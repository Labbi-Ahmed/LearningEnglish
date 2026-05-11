"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RunLogEntry } from "@/lib/cache/run-log";

type Kind = "words" | "users";

type LastRunResponse = {
  words: RunLogEntry | null;
  users: RunLogEntry | null;
};

type Props = {
  initialWords: RunLogEntry | null;
  initialUsers: RunLogEntry | null;
};

const ENDPOINTS: Record<Kind, string> = {
  words: "/api/admin/cache/warm-words",
  users: "/api/admin/cache/warm-users",
};

const META: Record<Kind, { title: string; description: string; verb: string }> = {
  words: {
    title: "Warm dictionary",
    description: "Pre-fill word:<slug> for every row in the words table. Daily cron at 03:00 UTC.",
    verb: "Warm dictionary",
  },
  users: {
    title: "Warm user caches",
    description:
      "Refresh user:<id>:words:list + user:<id>:saved for users active in the last 14 days. Daily cron at 03:30 UTC.",
    verb: "Warm user caches",
  },
};

export function CachePanel({ initialWords, initialUsers }: Props) {
  const qc = useQueryClient();

  const lastRun = useQuery<LastRunResponse>({
    queryKey: ["admin-cache-last-run"],
    queryFn: async () => {
      const res = await fetch("/api/admin/cache/last-run");
      if (!res.ok) throw new Error("last_run_failed");
      return res.json();
    },
    initialData: { words: initialWords, users: initialUsers },
  });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <WarmCard kind="words" lastRun={lastRun.data?.words ?? null} onMutated={() => qc.invalidateQueries({ queryKey: ["admin-cache-last-run"] })} />
      <WarmCard kind="users" lastRun={lastRun.data?.users ?? null} onMutated={() => qc.invalidateQueries({ queryKey: ["admin-cache-last-run"] })} />
    </div>
  );
}

function WarmCard({
  kind,
  lastRun,
  onMutated,
}: {
  kind: Kind;
  lastRun: RunLogEntry | null;
  onMutated: () => void;
}) {
  const [notice, setNotice] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(ENDPOINTS[kind], { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (res.status === 503) throw new Error("cache_unavailable");
      if (!res.ok) throw new Error(String(body.error ?? "failed"));
      return body;
    },
    onSuccess: (body) => {
      if (body.already_running) {
        setNotice("Another run is in progress. Try again in a few minutes.");
      } else {
        setNotice(null);
      }
      onMutated();
    },
    onError: (err) => setNotice((err as Error).message),
  });

  const meta = META[kind];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{meta.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{meta.description}</p>

        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          {lastRun ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Last run {new Date(lastRun.ranAt).toLocaleString()}
              </p>
              <p className="text-xs">
                Trigger: <span className="font-mono">{lastRun.actorId}</span>
              </p>
              <pre className="mt-1 overflow-x-auto rounded bg-background p-2 text-xs">
                {JSON.stringify(lastRun.result, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No run recorded yet.</p>
          )}
        </div>

        {notice ? (
          <div className="rounded border bg-muted px-3 py-2 text-sm">{notice}</div>
        ) : null}

        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Running…" : meta.verb}
        </Button>
      </CardContent>
    </Card>
  );
}
