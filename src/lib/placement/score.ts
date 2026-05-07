import type { CefrLevel } from "@/lib/schemas/placement";

// Map percentage correct → CEFR band. Tuned for a 13-question bank but
// keyed off a fraction so the bank size can change.
export function bandForScore(score: number, total: number): CefrLevel {
  if (total <= 0) return "a1";
  const pct = score / total;
  if (pct >= 0.92) return "c2";
  if (pct >= 0.83) return "c1";
  if (pct >= 0.7) return "b2";
  if (pct >= 0.55) return "b1";
  if (pct >= 0.35) return "a2";
  return "a1";
}
