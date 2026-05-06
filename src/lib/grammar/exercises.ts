import type { ExerciseItem } from "@/lib/schemas/grammar";

function normalise(s: string): string {
  return s.trim().toLowerCase();
}

export function scoreItem(item: ExerciseItem, answer: string | string[]): boolean {
  switch (item.type) {
    case "fill_in_blank": {
      const userAnswer = normalise(Array.isArray(answer) ? answer[0] : answer);
      const accepted = Array.isArray(item.answer)
        ? item.answer.map(normalise)
        : [normalise(item.answer)];
      return accepted.some((a) => a === userAnswer);
    }
    case "multiple_choice": {
      const idx = typeof answer === "number" ? answer : parseInt(String(answer), 10);
      return idx === item.correct_index;
    }
    case "reorder": {
      const userOrder = Array.isArray(answer) ? answer : [answer];
      return (
        userOrder.length === item.prompt.length &&
        userOrder.every((token, i) => normalise(token) === normalise(item.prompt[i]))
      );
    }
  }
}

export function scoreLesson(
  items: ExerciseItem[],
  answers: (string | string[] | number)[],
): { score: number; total: number; results: boolean[] } {
  const results = items.map((item, i) =>
    scoreItem(item, answers[i] as string | string[]),
  );
  return {
    score: results.filter(Boolean).length,
    total: items.length,
    results,
  };
}
