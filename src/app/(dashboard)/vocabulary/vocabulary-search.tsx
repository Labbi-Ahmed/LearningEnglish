"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { speak } from "@/lib/speech";
import type { SavedWordItem } from "./types";

interface LookupResponse {
  word: string;
  word_id: string;
  pos: string | null;
  ipa_uk: string | null;
  ipa_us: string | null;
  meaning: string | null;
  example: string | null;
  synonyms: string[];
  antonyms: string[];
}

async function fetchWord(slug: string): Promise<LookupResponse> {
  const res = await fetch(`/api/words/${encodeURIComponent(slug)}`);
  if (res.status === 404) throw new Error("word_not_found");
  if (!res.ok) throw new Error("lookup_unavailable");
  return res.json();
}

export function VocabularySearch({
  activeWord,
  onSearch,
}: {
  activeWord: string | null;
  onSearch: (w: string | null) => void;
}) {
  const [input, setInput] = useState("");

  const query = useQuery<LookupResponse, Error>({
    queryKey: ["word", activeWord],
    queryFn: () => fetchWord(activeWord as string),
    enabled: Boolean(activeWord),
    retry: false,
  });

  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const next = input.trim().toLowerCase();
          if (next) onSearch(next);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a word, e.g. serendipity"
          autoFocus
        />
        <Button type="submit">Look up</Button>
      </form>

      {query.isFetching && <p className="text-sm text-muted-foreground">Looking up…</p>}

      {query.isError && query.error.message === "word_not_found" && (
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t find that word — check the spelling.
        </p>
      )}
      {query.isError && query.error.message !== "word_not_found" && (
        <p className="text-sm text-destructive">
          The dictionary is unavailable right now. Please try again in a moment.
        </p>
      )}

      {query.data && <WordCard key={query.data.word} word={query.data} />}
    </div>
  );
}

function WordCard({ word }: { word: LookupResponse }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"idle" | "saved" | "already" | "error">("idle");

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/words/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: word.word }),
      });
      if (!res.ok) throw new Error("save_failed");
      return res.json() as Promise<{ saved: boolean; already: boolean; word_id: string }>;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["saved-words"] });
      const previous = qc.getQueriesData<{ items: SavedWordItem[]; nextOffset: number | null }>({
        queryKey: ["saved-words"],
      });
      qc.setQueriesData<{ items: SavedWordItem[]; nextOffset: number | null }>(
        { queryKey: ["saved-words"] },
        (old) => {
          if (!old) return old;
          if (old.items.some((i) => i.word === word.word)) return old;
          const optimistic: SavedWordItem = {
            id: `optimistic-${word.word_id}`,
            word_id: word.word_id,
            word: word.word,
            pos: word.pos,
            meaning: word.meaning,
            ipa_uk: word.ipa_uk,
            ipa_us: word.ipa_us,
            created_at: new Date().toISOString(),
            optimistic: true,
          };
          return { ...old, items: [optimistic, ...old.items] };
        },
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.previous?.forEach(([key, data]) => qc.setQueryData(key, data));
      setStatus("error");
    },
    onSuccess: (data) => {
      setStatus(data.already ? "already" : "saved");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["saved-words"] });
    },
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline gap-3">
          <span className="text-2xl">{word.word}</span>
          {word.pos && (
            <span className="text-sm font-normal text-muted-foreground">{word.pos}</span>
          )}
        </CardTitle>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {word.ipa_uk && <span>UK {word.ipa_uk}</span>}
          {word.ipa_us && <span>US {word.ipa_us}</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => speak(word.word, "uk")}>
            Play UK
          </Button>
          <Button size="sm" variant="outline" onClick={() => speak(word.word, "us")}>
            Play US
          </Button>
          {status !== "saved" && status !== "already" && (
            <Button
              size="sm"
              onClick={() => save.mutate()}
              disabled={save.isPending}
            >
              {save.isPending ? "Saving…" : "Save to my words"}
            </Button>
          )}
          {status === "saved" && (
            <span className="self-center text-sm text-muted-foreground">✓ Saved</span>
          )}
          {status === "already" && (
            <span className="self-center text-sm text-muted-foreground">Already in your bank</span>
          )}
          {status === "error" && (
            <span className="self-center text-sm text-destructive">Save failed — try again.</span>
          )}
        </div>
        {word.meaning && (
          <p>
            <span className="font-medium">Meaning. </span>
            {word.meaning}
          </p>
        )}
        {word.example && (
          <p className="italic text-muted-foreground">&ldquo;{word.example}&rdquo;</p>
        )}
        {word.synonyms.length > 0 && (
          <p className="text-sm">
            <span className="font-medium">Synonyms: </span>
            {word.synonyms.slice(0, 8).join(", ")}
          </p>
        )}
        {word.antonyms.length > 0 && (
          <p className="text-sm">
            <span className="font-medium">Antonyms: </span>
            {word.antonyms.slice(0, 8).join(", ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
