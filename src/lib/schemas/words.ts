import { z } from "zod";

export const WordSlugSchema = z
  .string()
  .min(1)
  .max(60)
  .regex(/^[a-z][a-z'-]*$/, "Word must be lowercase letters, apostrophes, or hyphens");

export const SaveWordBodySchema = z.object({
  word: z.string().min(1).max(60).trim(),
});
export type SaveWordBody = z.infer<typeof SaveWordBodySchema>;

export const ListWordsQuerySchema = z.object({
  q: z.string().trim().min(1).max(60).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListWordsQuery = z.infer<typeof ListWordsQuerySchema>;

export const WordIdParamSchema = z.string().uuid();
