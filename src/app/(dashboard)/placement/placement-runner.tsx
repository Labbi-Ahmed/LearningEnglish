"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { speak } from "@/lib/speech";
import {
  PLACEMENT_QUESTIONS,
  type PlacementQuestion,
} from "@/lib/placement/questions";
import type { PlacementResponse } from "@/lib/schemas/placement";

type Phase = "intro" | "running" | "submitting" | "done" | "error";

export function PlacementRunner() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PlacementResponse | null>(null);
  const [errMsg, setErrMsg] = useState<string>("");

  const total = PLACEMENT_QUESTIONS.length;
  const current = PLACEMENT_QUESTIONS[index];

  const choose = (q: PlacementQuestion, opt: string) => {
    setAnswers((prev) => ({ ...prev, [q.id]: opt }));
  };

  const next = async () => {
    if (index < total - 1) {
      setIndex(index + 1);
      return;
    }
    setPhase("submitting");
    try {
      const res = await fetch("/api/profile/placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: PLACEMENT_QUESTIONS.map((q) => ({
            question_id: q.id,
            answer: answers[q.id] ?? "",
          })),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "save_failed");
      }
      const data = (await res.json()) as PlacementResponse;
      setResult(data);
      setPhase("done");
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "save_failed");
      setPhase("error");
    }
  };

  if (phase === "intro") {
    return (
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <p className="text-sm">
          Answer each question with your best guess. There is no penalty for
          wrong answers — skipping just lowers your score.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => setPhase("running")}>Start</Button>
          <Button variant="ghost" asChild>
            <Link href="/dashboard">Skip for now</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "submitting") {
    return <p className="text-muted-foreground">Scoring…</p>;
  }

  if (phase === "error") {
    return (
      <div className="rounded-xl border bg-card p-6 space-y-3">
        <p className="text-destructive">Could not save: {errMsg}</p>
        <Button onClick={() => setPhase("running")}>Try again</Button>
      </div>
    );
  }

  if (phase === "done" && result) {
    return (
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-xl font-semibold">Your level: {result.level.toUpperCase()}</h2>
        <p className="text-muted-foreground">
          Score: {result.score} / {result.total}. Your dashboard now reflects
          this level.
        </p>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard">Continue to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const selected = answers[current.id] ?? null;

  return (
    <div className="rounded-xl border bg-card p-6 space-y-5">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Question {index + 1} / {total}
        </span>
        <span className="capitalize">{current.kind}</span>
      </div>

      {current.passage && (
        <p className="text-sm bg-muted rounded-lg p-3 italic">
          {current.passage}
        </p>
      )}

      {current.kind === "listening" && current.tts_text && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => speak(current.tts_text!, "uk")}
        >
          ▶ Play audio
        </Button>
      )}

      <p className="font-medium">{current.prompt}</p>

      <div className="grid gap-2">
        {current.options.map((opt) => (
          <Button
            key={opt}
            variant={selected === opt ? "default" : "outline"}
            className="h-auto py-3 text-left justify-start text-wrap"
            onClick={() => choose(current, opt)}
          >
            {opt}
          </Button>
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <Button
          variant="ghost"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          Back
        </Button>
        <Button onClick={next} disabled={!selected}>
          {index < total - 1 ? "Next" : "Finish"}
        </Button>
      </div>
    </div>
  );
}
