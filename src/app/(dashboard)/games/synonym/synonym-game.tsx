"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { GameShell } from "@/components/games/game-shell";
import { Button } from "@/components/ui/button";
import type { BatchItem, GameSubmitPayload } from "@/lib/games/types";

type BatchResponse = { items: BatchItem[]; meta: { accent: string } };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}

function SynonymItem({
  item,
  onAnswer,
}: {
  item: BatchItem;
  onAnswer: (correct: boolean) => void;
}) {
  const options = useMemo(() => {
    const all = [item.correct_synonym ?? "", ...(item.distractors ?? [])].filter(Boolean);
    return shuffle(all);
  }, [item.word_id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rounded-xl border bg-card p-6 space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Pick the synonym of</p>
        <p className="text-2xl font-bold mt-1">{item.word}</p>
        {item.meaning && (
          <p className="text-sm text-muted-foreground mt-1 italic">{item.meaning}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => (
          <Button
            key={opt}
            variant="outline"
            className="h-auto py-3 text-wrap"
            onClick={() => onAnswer(opt === item.correct_synonym)}
          >
            {opt}
          </Button>
        ))}
      </div>
    </div>
  );
}

type SynonymGameProps = { mode?: "synonym" | "antonym" };

export function SynonymGame({ mode = "synonym" }: SynonymGameProps) {
  const { data, isLoading, error } = useQuery<BatchResponse>({
    queryKey: ["games-batch", "synonym", mode],
    queryFn: async () => {
      const res = await fetch(`/api/games/words?game=synonym&size=10&mode=${mode}`);
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
    await fetch("/api/games/synonym/result", {
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
          You need at least 4 saved words with synonyms to play. Save more words via{" "}
          <a href="/vocabulary" className="underline">Vocabulary</a>.
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
        <SynonymItem key={item.word_id} item={item} onAnswer={onAnswer} />
      )}
    />
  );
}
