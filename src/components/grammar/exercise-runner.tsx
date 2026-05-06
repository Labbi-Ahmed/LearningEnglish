"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { scoreLesson } from "@/lib/grammar/exercises";
import type { ExerciseItem } from "@/lib/schemas/grammar";

const COMPLETION_THRESHOLD = 0.7;

// ── Per-exercise input components ────────────────────────────────────

function FillInBlank({
  prompt,
  value,
  onChange,
  submitted,
  correct,
}: {
  prompt: string;
  value: string;
  onChange: (v: string) => void;
  submitted: boolean;
  correct: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{prompt}</p>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={submitted}
        placeholder="Type your answer…"
        className={submitted ? (correct ? "border-green-500" : "border-destructive") : ""}
      />
    </div>
  );
}

function MultipleChoice({
  prompt,
  options,
  value,
  onChange,
  submitted,
  correct,
  correctIndex,
}: {
  prompt: string;
  options: string[];
  value: number | null;
  onChange: (i: number) => void;
  submitted: boolean;
  correct: boolean;
  correctIndex: number;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{prompt}</p>
      <div className="grid gap-2">
        {options.map((opt, i) => {
          let variant: "default" | "outline" | "ghost" = "outline";
          if (submitted) {
            if (i === correctIndex) variant = "default";
            else if (i === value && !correct) variant = "ghost";
          } else if (i === value) {
            variant = "default";
          }
          return (
            <Button
              key={i}
              variant={variant}
              className="justify-start h-auto py-2 text-left text-wrap"
              onClick={() => !submitted && onChange(i)}
              disabled={submitted}
            >
              {opt}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function Reorder({
  correctOrder,
  shuffled,
  value,
  onChange,
  submitted,
  correct,
}: {
  correctOrder: string[];
  shuffled: string[];
  value: string[];
  onChange: (v: string[]) => void;
  submitted: boolean;
  correct: boolean;
}) {
  const pool = useMemo(
    () => shuffled.filter((t, i) => shuffled.indexOf(t) === i || !value.includes(t)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const available = pool.filter(
    (t) => value.filter((v) => v === t).length < shuffled.filter((s) => s === t).length,
  );

  const pick = (token: string) => {
    if (submitted) return;
    onChange([...value, token]);
  };

  const remove = (i: number) => {
    if (submitted) return;
    onChange(value.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Put the words in the correct order:</p>
      <div
        className={`min-h-10 p-3 rounded-lg bg-muted flex flex-wrap gap-2 ${
          submitted ? (correct ? "border border-green-500" : "border border-destructive") : ""
        }`}
      >
        {value.length === 0 && (
          <span className="text-sm text-muted-foreground">Tap words below…</span>
        )}
        {value.map((token, i) => (
          <button
            key={i}
            onClick={() => remove(i)}
            disabled={submitted}
            className="px-2 py-1 rounded bg-background border text-sm hover:bg-accent disabled:opacity-60"
          >
            {token}
          </button>
        ))}
      </div>
      {submitted && !correct && (
        <p className="text-xs text-muted-foreground">
          Correct order: {correctOrder.join(" ")}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {available.map((token, i) => (
          <button
            key={i}
            onClick={() => pick(token)}
            disabled={submitted}
            className="px-2 py-1 rounded bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-60"
          >
            {token}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main runner ──────────────────────────────────────────────────────

type Answer = string | number | string[];

type ExerciseRunnerProps = {
  lessonId: string;
  exercises: ExerciseItem[];
  onComplete?: (score: number, total: number) => void;
};

export function ExerciseRunner({ lessonId, exercises, onComplete }: ExerciseRunnerProps) {
  const [answers, setAnswers] = useState<Answer[]>(() => exercises.map(() => ""));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);

  const setAnswer = (i: number, val: Answer) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[i] = val;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (submitted) return;
    const { score, total, results: res } = scoreLesson(exercises, answers as (string | string[])[]);
    setResults(res);
    setSubmitted(true);

    const completed = score / total >= COMPLETION_THRESHOLD;
    setSaving(true);
    try {
      await fetch("/api/grammar/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_id: lessonId, score, completed }),
      });
    } catch {
      // non-blocking
    }
    setSaving(false);
    onComplete?.(score, total);
  };

  if (exercises.length === 0) return null;

  const finalScore = submitted ? results.filter(Boolean).length : 0;
  const total = exercises.length;
  const passed = submitted && finalScore / total >= COMPLETION_THRESHOLD;

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold">Exercises</h2>

      {exercises.map((ex, i) => {
        const correct = submitted ? results[i] : false;
        return (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">#{i + 1}</span>
              {submitted && (
                <span
                  className={`text-xs font-medium ${correct ? "text-green-600" : "text-destructive"}`}
                >
                  {correct ? "Correct" : "Incorrect"}
                </span>
              )}
            </div>

            {ex.type === "fill_in_blank" && (
              <FillInBlank
                prompt={ex.prompt}
                value={answers[i] as string}
                onChange={(v) => setAnswer(i, v)}
                submitted={submitted}
                correct={correct}
              />
            )}
            {ex.type === "multiple_choice" && (
              <MultipleChoice
                prompt={ex.prompt}
                options={ex.options}
                value={answers[i] === "" ? null : (answers[i] as number)}
                onChange={(v) => setAnswer(i, v)}
                submitted={submitted}
                correct={correct}
                correctIndex={ex.correct_index}
              />
            )}
            {ex.type === "reorder" && (
              <Reorder
                correctOrder={ex.prompt}
                shuffled={ex.shuffled}
                value={answers[i] as string[]}
                onChange={(v) => setAnswer(i, v)}
                submitted={submitted}
                correct={correct}
              />
            )}
          </div>
        );
      })}

      {!submitted ? (
        <Button onClick={handleSubmit} className="w-full sm:w-auto">
          Submit exercises
        </Button>
      ) : (
        <div className="rounded-xl border p-6 space-y-3">
          <h3 className="text-lg font-bold">
            {passed ? "Lesson complete! 🎉" : "Keep practising"}
          </h3>
          <p className="text-muted-foreground">
            Score: <span className="font-medium text-foreground">{finalScore}/{total}</span>
          </p>
          {!passed && (
            <p className="text-sm text-muted-foreground">
              Score {Math.round(COMPLETION_THRESHOLD * 100)}% or higher to mark this lesson as complete.
            </p>
          )}
          {saving && <p className="text-xs text-muted-foreground">Saving…</p>}
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
