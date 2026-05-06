import { z } from "zod";

export const GameTypeSchema = z.enum(["spell", "sentence", "synonym", "quiz"]);
export type GameType = z.infer<typeof GameTypeSchema>;

export const BatchQuerySchema = z.object({
  game: GameTypeSchema,
  size: z.coerce.number().int().min(1).max(20).default(10),
  mode: z.enum(["synonym", "antonym"]).default("synonym"),
});
export type BatchQuery = z.infer<typeof BatchQuerySchema>;

export const ResultItemSchema = z.object({
  word_id: z.string().uuid(),
  correct: z.boolean(),
});
export type ResultItem = z.infer<typeof ResultItemSchema>;

export const ResultBodySchema = z
  .object({
    score: z.number().int().min(0),
    total: z.number().int().min(1),
    duration_ms: z.number().int().min(0),
    items: z.array(ResultItemSchema).min(1),
  })
  .refine((d) => d.score <= d.total && d.total === d.items.length, {
    message: "invalid_result",
  });
export type ResultBody = z.infer<typeof ResultBodySchema>;
