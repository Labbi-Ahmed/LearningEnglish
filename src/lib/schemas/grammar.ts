import { z } from "zod";

// ── Exercise types ────────────────────────────────────────────────────

export const FillInBlankSchema = z.object({
  type: z.literal("fill_in_blank"),
  prompt: z.string(),
  answer: z.union([z.string(), z.array(z.string())]),
});

export const MultipleChoiceSchema = z.object({
  type: z.literal("multiple_choice"),
  prompt: z.string(),
  options: z.array(z.string()).min(2),
  correct_index: z.number().int().min(0),
});

export const ReorderSchema = z.object({
  type: z.literal("reorder"),
  prompt: z.array(z.string()),
  shuffled: z.array(z.string()),
});

export const ExerciseItemSchema = z.discriminatedUnion("type", [
  FillInBlankSchema,
  MultipleChoiceSchema,
  ReorderSchema,
]);
export type ExerciseItem = z.infer<typeof ExerciseItemSchema>;

// ── Lesson content stored in the JSONB column ─────────────────────────

export const LessonContentSchema = z.object({
  body: z.string(),
  exercises: z.array(ExerciseItemSchema),
});
export type LessonContent = z.infer<typeof LessonContentSchema>;

// ── Lesson row ────────────────────────────────────────────────────────

export const GrammarLessonSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  level: z.string(),
  category: z.string(),
  content: LessonContentSchema,
  order_index: z.number().int(),
});
export type GrammarLesson = z.infer<typeof GrammarLessonSchema>;

// ── API query ─────────────────────────────────────────────────────────

const CEFR = ["a1", "a2", "b1", "b2", "c1", "c2"] as const;

export const LessonsQuerySchema = z.object({
  level: z.enum(CEFR).optional(),
});
export type LessonsQuery = z.infer<typeof LessonsQuerySchema>;

// ── Progress body ─────────────────────────────────────────────────────

export const ProgressBodySchema = z.object({
  lesson_id: z.string().uuid(),
  score: z.number().int().min(0),
  completed: z.boolean(),
});
export type ProgressBody = z.infer<typeof ProgressBodySchema>;
