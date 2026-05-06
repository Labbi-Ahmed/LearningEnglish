import { z } from "zod";

export const ChatBodySchema = z.object({
  conversation_id: z.string().uuid().optional(),
  message: z.string().min(1).max(4000),
});

export const WritingFeedbackBodySchema = z.object({
  text: z.string().min(1, "empty_text").max(2000),
});

export const RephraseBodySchema = z.object({
  sentence: z.string().min(1).max(500),
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
