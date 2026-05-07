import { z } from "zod";

export const UploadQuerySchema = z.object({});

export const ScoreBodySchema = z.object({
  recording_id: z.string().uuid(),
  target_text: z.string().min(1).max(2000),
  transcript: z.string().min(0).max(5000),
});

export type ScoreBody = z.infer<typeof ScoreBodySchema>;
