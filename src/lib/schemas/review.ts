import { z } from "zod";

export const DueQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type DueQuery = z.infer<typeof DueQuerySchema>;

export const ReviewBodySchema = z.object({
  user_word_id: z.string().uuid(),
  quality: z.number().int().min(0).max(5),
});
export type ReviewBody = z.infer<typeof ReviewBodySchema>;

export const DueItemSchema = z.object({
  user_word_id: z.string().uuid(),
  word_id: z.string().uuid(),
  word: z.string(),
  meaning: z.string().nullable(),
  example: z.string().nullable(),
  ipa_uk: z.string().nullable(),
  ipa_us: z.string().nullable(),
  next_review_at: z.string(),
  ease_factor: z.number(),
  interval_days: z.number(),
  repetitions: z.number(),
});
export type DueItem = z.infer<typeof DueItemSchema>;
