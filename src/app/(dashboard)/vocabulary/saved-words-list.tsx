"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { speak } from "@/lib/speech";
import type { SavedWordItem } from "./types";

interface ListResponse {
  items: SavedWordItem[];
  nextOffset: number | null;
}

async function fetchSaved(q: string): Promise<ListResponse> {
  const url = q
    ? `/api/words?limit=50&q=${encodeURIComponent(q)}`
    : "/api/words?limit=50";
  const res = await fetch(url);
  if (!res.ok) throw new Error("list_failed");
  return res.json();
}

export function SavedWordsList({
  onViewDetails,
}: {
  onViewDetails?: (item: SavedWordItem) => void;
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 200);
    return () => clearTimeout(t);
  }, [search]);

  const list = useQuery<ListResponse, Error>({
    queryKey: ["saved-words", debounced],
    queryFn: () => fetchSaved(debounced),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/words/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("delete_failed");
      return id;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["saved-words"] });
      const previous = qc.getQueriesData<ListResponse>({ queryKey: ["saved-words"] });
      qc.setQueriesData<ListResponse>({ queryKey: ["saved-words"] }, (old) =>
        old ? { ...old, items: old.items.filter((i) => i.id !== id) } : old,
      );
      return { previous };
    },
    onError: (_e, _id, ctx) => {
      ctx?.previous?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["saved-words"] });
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">My words</h2>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search saved…"
          className="max-w-xs"
        />
      </div>

      {list.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {list.isError && (
        <p className="text-sm text-destructive">Could not load your words.</p>
      )}

      {list.data && list.data.items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {debounced
            ? `No saved words match "${debounced}".`
            : "No saved words yet — look one up above to start your bank."}
        </p>
      )}

      {list.data && list.data.items.length > 0 && (
        <ul className="divide-y rounded-md border">
          {list.data.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => onViewDetails?.(item)}
            >
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium">{item.word}</span>
                  {item.pos && (
                    <span className="text-xs text-muted-foreground">{item.pos}</span>
                  )}
                </div>
                {item.meaning && (
                  <p className="truncate text-sm text-muted-foreground">{item.meaning}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => speak(item.word, "uk")}
                  aria-label="Play UK"
                >
                  UK
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => speak(item.word, "us")}
                  aria-label="Play US"
                >
                  US
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => remove.mutate(item.id)}
                  disabled={Boolean(item.optimistic) || remove.isPending}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
