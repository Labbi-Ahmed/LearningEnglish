import { z } from "zod";
import { CefrLevelSchema } from "./placement";
import { BadgeSchema } from "./engagement";

export const GameStatSchema = z.object({
  plays: z.number().int().min(0),
  avg_score: z.number().nullable(),
});
export type GameStat = z.infer<typeof GameStatSchema>;

export const ProgressDashboardSchema = z.object({
  level: CefrLevelSchema,
  words: z.object({
    saved: z.number().int().min(0),
    mastered: z.number().int().min(0),
    due_today: z.number().int().min(0),
  }),
  games: z.object({
    spell: GameStatSchema,
    sentence: GameStatSchema,
    synonym: GameStatSchema,
    quiz: GameStatSchema,
  }),
  grammar: z.object({
    lessons_completed: z.number().int().min(0),
    total_lessons: z.number().int().min(0),
  }),
  speaking: z.object({
    attempts: z.number().int().min(0),
    avg_accuracy: z.number().nullable(),
  }),
  ai: z.object({
    conversations: z.number().int().min(0),
  }),
  streak: z.object({
    current_days: z.number().int().min(0),
  }),
  xp: z.object({
    total: z.number().int().min(0),
    this_week: z.number().int().min(0),
  }),
  badges: z.array(BadgeSchema),
});
export type ProgressDashboard = z.infer<typeof ProgressDashboardSchema>;
