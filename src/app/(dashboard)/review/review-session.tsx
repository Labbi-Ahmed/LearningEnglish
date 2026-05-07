"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { speak } from "@/lib/speech";
import type { DueItem } from "@/lib/schemas/review";

type Rating = { label: string; quality: number; key: string };
const RATINGS: Rating[] = [
  { label: "Again", quality: 1, key: "1" },
  { label: "Hard",  quality: 3, key: "2" },
  { label: "Good",  quality: 4, key: "3" },
  { label: "Easy",  quality: 5, key: "4" },
];

export function ReviewSession({ initialItems }: { initialItems: DueItem[] }) {
  const router = useRouter();
  const [items] = useState<DueItem[]>(initialItems);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const current = items[index];
  const done = index >= items.length;

  const submit = useCallback(
    async (quality: number) => {
      if (!current || submitting) return;
      setSubmitting(true);
      try {
        await fetch("/api/words/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_word_id: current.user_word_id, quality }),
        });
      } catch {
        // non-blocking — keep advancing
      }
      setSubmitting(false);
      setRevealed(false);
      setIndex((i) => i + 1);
    },
    [current, submitting],
  );

  // Keyboard shortcuts: space/enter reveals; 1-4 rate after reveal.
  useEffect(() => {
    if (done) return;
    const handler = (e: KeyboardEvent) => {
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
        return;
      }
      if (revealed) {
        const r = RATINGS.find((x) => x.key === e.key);
        if (r) {
          e.preventDefault();
          submit(r.quality);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [revealed, done, submit]);

  // Refresh server data (badge count) when the session ends.
  useEffect(() => {
    if (done) router.refresh();
  }, [done, router]);

  if (items.length === 0 || done) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center space-y-4">
        <p className="text-lg font-medium">All caught up — see you tomorrow.</p>
        <p className="text-sm text-muted-foreground">
          Reviewed {items.length} word{items.length === 1 ? "" : "s"} today.
        </p>
        <div className="flex justify-center gap-2">
          <Button asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="rounded-xl border bg-card p-6 space-y-5">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {index + 1} / {items.length}
        </span>
        <span>rep {current.repetitions}</span>
      </div>

      <div className="text-center space-y-2 py-4">
        <p className="text-3xl font-bold">{current.word}</p>
        <div className="flex justify-center gap-3 text-sm text-muted-foreground">
          {current.ipa_uk && <span className="font-mono">{current.ipa_uk}</span>}
          <button
            type="button"
            onClick={() => speak(current.word, "uk")}
            className="text-primary hover:underline"
          >
            ▶ UK
          </button>
          <button
            type="button"
            onClick={() => speak(current.word, "us")}
            className="text-primary hover:underline"
          >
            ▶ US
          </button>
        </div>
      </div>

      {!revealed ? (
        <Button className="w-full" onClick={() => setRevealed(true)}>
          Show answer (Space)
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4 space-y-2">
            {current.meaning && (
              <p>
                <span className="font-medium">Meaning. </span>
                {current.meaning}
              </p>
            )}
            {current.example && (
              <p className="italic text-muted-foreground">
                &ldquo;{current.example}&rdquo;
              </p>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map((r) => (
              <Button
                key={r.label}
                variant={r.label === "Again" ? "destructive" : r.label === "Easy" ? "default" : "outline"}
                onClick={() => submit(r.quality)}
                disabled={submitting}
                className="flex-col h-auto py-3"
              >
                <span className="font-medium">{r.label}</span>
                <span className="text-xs opacity-70">{r.key}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
