import { z } from "zod";

export const XP_SOURCES = ["game", "review", "lesson", "speaking", "chat", "streak_bonus"] as const;
export type XpSource = (typeof XP_SOURCES)[number];

export const SubscribeBodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});
export type SubscribeBody = z.infer<typeof SubscribeBodySchema>;

export const UnsubscribeBodySchema = z.object({
  endpoint: z.string().url(),
});
export type UnsubscribeBody = z.infer<typeof UnsubscribeBodySchema>;

export const LeaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type LeaderboardQuery = z.infer<typeof LeaderboardQuerySchema>;

export const EmailWeeklyBodySchema = z.object({
  enabled: z.boolean(),
});
export type EmailWeeklyBody = z.infer<typeof EmailWeeklyBodySchema>;

export const BadgeSchema = z.object({
  key: z.string(),
  earned_at: z.string(),
});
export type Badge = z.infer<typeof BadgeSchema>;

export const LeaderboardRowSchema = z.object({
  display_name: z.string(),
  level: z.string(),
  weekly_xp: z.number().int().min(0),
  is_self: z.boolean(),
});
export type LeaderboardRow = z.infer<typeof LeaderboardRowSchema>;
