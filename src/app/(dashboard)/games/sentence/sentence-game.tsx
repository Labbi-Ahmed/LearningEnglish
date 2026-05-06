"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { GameShell } from "@/components/games/game-shell";
import { Button } from "@/components/ui/button";
import type { BatchItem, GameSubmitPayload } from "@/lib/games/types";

type BatchResponse = { items: BatchItem[]; meta: { accent: string } };

function tokenize(s: string): string[] {
  return s.split(/\s+/).filter(Boolean);
}

function normalize(tokens: string[]): string {
  return tokens.join(" ").trim().toLowerCase().replace(/[.!?,;:]+$/, "");
}

function SentenceItem({
  item,
  onAnswer,
}: {
  item: BatchItem;
  onAnswer: (correct: boolean) => void;
}) {
  const original = item.example ?? "";
  const originalTokens = tokenize(original);

  const [pool, setPool] = useState<string[]>([]);
  const [built, setBuilt] = useState<string[]>([]);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    const shuffled = [...originalTokens].sort(() => Math.random() - 0.5);
    setPool(shuffled);
    setBuilt([]);
    setAnswered(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.word_id]);

  const pickFromPool = (i: number) => {
    if (answered) return;
    const token = pool[i];
    setPool((p) => p.filter((_, idx) => idx !== i));
    setBuilt((b) => [...b, token]);
  };

  const returnToPool = (i: number) => {
    if (answered) return;
    const token = built[i];
    setBuilt((b) => b.filter((_, idx) => idx !== i));
    setPool((p) => [...p, token]);
  };

  const check = () => {
    if (answered || built.length === 0) return;
    setAnswered(true);
    const correct = normalize(built) === normalize(originalTokens);
    onAnswer(correct);
  };

  const skip = () => {
    if (answered) return;
    setAnswered(true);
    onAnswer(false);
  };

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <p className="text-sm text-muted-foreground">
        Rearrange the words to form a sentence with{" "}
        <span className="font-medium text-foreground">{item.word}</span>
      </p>

      {/* Build area */}
      <div className="min-h-12 p-3 rounded-lg bg-muted flex flex-wrap gap-2">
        {built.length === 0 && (
          <span className="text-sm text-muted-foreground">Tap words below to build the sentence…</span>
        )}
        {built.map((token, i) => (
          <button
            key={i}
            onClick={() => returnToPool(i)}
            disabled={answered}
            className="px-2 py-1 rounded bg-background border text-sm hover:bg-accent disabled:opacity-60"
          >
            {token}
          </button>
        ))}
      </div>

      {/* Token pool */}
      <div className="flex flex-wrap gap-2">
        {pool.map((token, i) => (
          <button
            key={i}
            onClick={() => pickFromPool(i)}
            disabled={answered}
            className="px-2 py-1 rounded bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-60"
          >
            {token}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Button onClick={check} disabled={answered || built.length === 0}>
          Check
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={skip} disabled={answered}>
          Skip
        </Button>
      </div>
    </div>
  );
}

export function SentenceGame() {
  const { data, isLoading, error } = useQuery<BatchResponse>({
    queryKey: ["games-batch", "sentence"],
    queryFn: async () => {
      const res = await fetch("/api/games/words?game=sentence&size=10");
      if (!res.ok) {
        const body = (await res.json()) as { error: string };
        throw new Error(body.error);
      }
      return res.json() as Promise<BatchResponse>;
    },
    staleTime: Infinity,
    retry: false,
  });

  const handleSubmit = async (payload: GameSubmitPayload) => {
    await fetch("/api/games/sentence/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  };

  if (isLoading) return <p className="text-muted-foreground">Loading words…</p>;

  if (error) {
    const msg = error instanceof Error ? error.message : "error";
    if (msg === "not_enough_words") {
      return (
        <p className="text-muted-foreground">
          You need at least 4 saved words with example sentences to play. Try the{" "}
          <a href="/vocabulary" className="underline">Vocabulary</a> page to save more words.
        </p>
      );
    }
    return <p className="text-destructive">Failed to load game. Please try again.</p>;
  }

  if (!data) return null;

  return (
    <GameShell
      items={data.items}
      onSubmit={handleSubmit}
      renderItem={(item, onAnswer) => (
        <SentenceItem key={item.word_id} item={item} onAnswer={onAnswer} />
      )}
    />
  );
}
