import { z } from "zod";

export const CefrLevelSchema = z.enum(["a1", "a2", "b1", "b2", "c1", "c2"]);
export type CefrLevel = z.infer<typeof CefrLevelSchema>;

export const PlacementAnswerSchema = z.object({
  question_id: z.string().min(1),
  answer: z.string(),
});
export type PlacementAnswer = z.infer<typeof PlacementAnswerSchema>;

export const PlacementBodySchema = z.object({
  answers: z.array(PlacementAnswerSchema).min(1).max(50),
});
export type PlacementBody = z.infer<typeof PlacementBodySchema>;

export const PlacementResponseSchema = z.object({
  level: CefrLevelSchema,
  score: z.number().int().min(0),
  total: z.number().int().min(1),
  band: CefrLevelSchema,
});
export type PlacementResponse = z.infer<typeof PlacementResponseSchema>;
