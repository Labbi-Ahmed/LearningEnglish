"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { GameShell } from "@/components/games/game-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { speak } from "@/lib/speech";
import type { BatchItem, GameSubmitPayload } from "@/lib/games/types";
import type { Accent } from "@/lib/speech";

type BatchResponse = { items: BatchItem[]; meta: { accent: Accent } };

function SpellItem({
  item,
  accent,
  onAnswer,
}: {
  item: BatchItem;
  accent: Accent;
  onAnswer: (correct: boolean) => void;
}) {
  const [value, setValue] = useState("");
  const [answered, setAnswered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-play TTS when item loads
  useEffect(() => {
    setValue("");
    setAnswered(false);
    speak(item.word, accent);
    inputRef.current?.focus();
  }, [item.word_id, item.word, accent]);

  const submit = () => {
    if (answered) return;
    setAnswered(true);
    const correct = value.trim().toLowerCase() === item.word.toLowerCase();
    onAnswer(correct);
  };

  return (
    <div className="rounded-xl border bg-card p-6 space-y-6">
      <p className="text-sm text-muted-foreground">What word means…</p>
      <p className="text-lg font-medium">{item.meaning ?? "—"}</p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => speak(item.word, accent)}
          disabled={answered}
        >
          Play again
        </Button>
      </div>
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Type the word…"
          disabled={answered}
          autoComplete="off"
        />
        <Button onClick={submit} disabled={answered}>
          Check
        </Button>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        onClick={() => { setAnswered(true); onAnswer(false); }}
        disabled={answered}
      >
        Skip
      </Button>
    </div>
  );
}

export function SpellGame() {
  const { data, isLoading, error } = useQuery<BatchResponse>({
    queryKey: ["games-batch", "spell"],
    queryFn: async () => {
      const res = await fetch("/api/games/words?game=spell&size=10");
      if (!res.ok) {
        const body = (await res.json()) as { error: string };
        throw new Error(body.error);
      }
      return res.json() as Promise<BatchResponse>;
    },
    staleTime: Infinity,
    retry: false,
  });

  const accent = data?.meta.accent ?? "uk";

  const handleSubmit = async (payload: GameSubmitPayload) => {
    await fetch("/api/games/spell/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  };

  if (isLoading) {
    return <p className="text-muted-foreground">Loading words…</p>;
  }

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
        <SpellItem key={item.word_id} item={item} accent={accent} onAnswer={onAnswer} />
      )}
    />
  );
}
