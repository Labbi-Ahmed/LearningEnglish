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
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function QuizItem({
  item,
  onAnswer,
}: {
  item: BatchItem;
  onAnswer: (correct: boolean) => void;
}) {
  const options = useMemo(() => {
    const all = [item.meaning ?? "", ...(item.distractors ?? [])].filter(Boolean);
    return shuffle(all);
  }, [item.word_id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rounded-xl border bg-card p-6 space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">What does this word mean?</p>
        <p className="text-2xl font-bold mt-1">{item.word}</p>
        {item.ipa_uk && (
          <p className="text-sm text-muted-foreground font-mono mt-1">{item.ipa_uk}</p>
        )}
      </div>
      <div className="grid gap-3">
        {options.map((opt) => (
          <Button
            key={opt}
            variant="outline"
            className="h-auto py-3 text-left justify-start text-wrap"
            onClick={() => onAnswer(opt === item.meaning)}
          >
            {opt}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function QuizGame() {
  const { data, isLoading, error } = useQuery<BatchResponse>({
    queryKey: ["games-batch", "quiz"],
    queryFn: async () => {
      const res = await fetch("/api/games/words?game=quiz&size=10");
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
    await fetch("/api/games/quiz/result", {
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
          You need at least 4 saved words to play. Go to{" "}
          <a href="/vocabulary" className="underline">Vocabulary</a> to save some words first.
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
        <QuizItem key={item.word_id} item={item} onAnswer={onAnswer} />
      )}
    />
  );
}
