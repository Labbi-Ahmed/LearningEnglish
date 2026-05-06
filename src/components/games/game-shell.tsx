"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { BatchItem, GameResultItem, GameSubmitPayload } from "@/lib/games/types";

export type { BatchItem };

type GameShellProps = {
  items: BatchItem[];
  renderItem: (item: BatchItem, onAnswer: (correct: boolean) => void) => React.ReactNode;
  onSubmit: (payload: GameSubmitPayload) => Promise<void>;
};

export function GameShell({ items, renderItem, onSubmit }: GameShellProps) {
  const [results, setResults] = useState<GameResultItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const submittedRef = useRef(false);

  const done = items.length > 0 && results.length === items.length;
  const index = Math.min(results.length, items.length - 1);
  const score = results.filter((r) => r.correct).length;

  // Timer — counts up until round is done
  useEffect(() => {
    if (done) return;
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [done]);

  // Submit once when all items are answered
  useEffect(() => {
    if (!done || submittedRef.current) return;
    submittedRef.current = true;
    const finalScore = results.filter((r) => r.correct).length;
    const duration_ms = Date.now() - startRef.current;
    setSubmitting(true);
    onSubmit({ score: finalScore, total: items.length, duration_ms, items: results })
      .catch(() => {})
      .finally(() => setSubmitting(false));
  }, [done, results, items, onSubmit]);

  // Uses functional setState so it reads the latest results without stale closure
  const handleAnswer = useCallback(
    (correct: boolean) => {
      setResults((prev) => {
        if (prev.length >= items.length) return prev;
        const next = items[prev.length];
        if (!next) return prev;
        return [...prev, { word_id: next.word_id, correct }];
      });
    },
    [items],
  );

  if (done) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-6">
        <h2 className="text-2xl font-bold">Round complete!</h2>
        <p className="text-5xl font-mono font-bold">
          {score}
          <span className="text-2xl text-muted-foreground">/{items.length}</span>
        </p>
        <p className="text-muted-foreground">{elapsed}s</p>
        {submitting && (
          <p className="text-sm text-muted-foreground">Saving result...</p>
        )}
        <div className="flex gap-3 justify-center pt-2">
          <Button onClick={() => window.location.reload()}>Play again</Button>
          <Button variant="outline" asChild>
            <Link href="/games">Back to games</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Score: {score}/{results.length}
        </span>
        <span>
          {index + 1} / {items.length}
        </span>
        <span>{elapsed}s</span>
      </div>
      <div className="h-1.5 rounded bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${(results.length / items.length) * 100}%` }}
        />
      </div>
      {items[index] && renderItem(items[index]!, handleAnswer)}
    </div>
  );
}
