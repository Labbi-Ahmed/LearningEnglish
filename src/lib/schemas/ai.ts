import { z } from "zod";
import { INPUT_CAPS } from "@/lib/quotas/limits";

export const wordCount = (s: string): number => {
  const trimmed = s.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
};

const cappedString = (caps: { words: number; chars: number }) =>
  z
    .string()
    .min(1)
    .max(caps.chars, { message: `chars_over_${caps.chars}` })
    .refine((s) => wordCount(s) <= caps.words, { message: `words_over_${caps.words}` });

export const ChatBodySchema = z.object({
  conversation_id: z.string().uuid().optional(),
  message: cappedString(INPUT_CAPS.ai_chat),
});

export const WritingFeedbackBodySchema = z.object({
  text: cappedString(INPUT_CAPS.ai_feedback),
});

export const RephraseBodySchema = z.object({
  sentence: cappedString(INPUT_CAPS.ai_rephrase),
  style: z.enum(["formal", "casual", "simple"]),
});

export const FeedbackIssueSchema = z.object({
  excerpt: z.string(),
  suggestion: z.string(),
  category: z.enum(["grammar", "spelling", "style", "clarity"]),
});

export const WritingFeedbackResponseSchema = z.object({
  corrected: z.string(),
  issues: z.array(FeedbackIssueSchema),
});

export type ChatBody = z.infer<typeof ChatBodySchema>;
export type WritingFeedbackBody = z.infer<typeof WritingFeedbackBodySchema>;
export type RephraseBody = z.infer<typeof RephraseBodySchema>;
export type WritingFeedbackResponse = z.infer<typeof WritingFeedbackResponseSchema>;
export type FeedbackIssue = z.infer<typeof FeedbackIssueSchema>;
