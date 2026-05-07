// Single source of truth for daily quotas, tier multipliers, and hard input
// caps. Tweaking any number here is the only diff needed.
// TODO(payments): when paid plans ship, also respect plan_expires_at on
// user_subscriptions before granting non-free tier limits.

export const QUOTA_ACTIONS = [
  "ai_chat",
  "ai_feedback",
  "ai_rephrase",
  "word_save",
  "speaking_attempt",
  "game_spell",
  "game_sentence",
  "game_synonym",
  "game_quiz",
] as const;

export type QuotaAction = (typeof QUOTA_ACTIONS)[number];

export const TIERS = ["free", "pro", "pro_max", "author"] as const;
export type Tier = (typeof TIERS)[number];

export const FREE_LIMITS: Record<QuotaAction, number> = {
  ai_chat: 5,
  ai_feedback: 5,
  ai_rephrase: 5,
  word_save: 20,
  speaking_attempt: 10,
  game_spell: 10,
  game_sentence: 10,
  game_synonym: 10,
  game_quiz: 10,
};

export const TIER_MULTIPLIER: Record<Tier, number> = {
  free: 1,
  pro: 5,
  pro_max: 10,
  author: Infinity,
};

export const TIER_LABEL: Record<Tier, string> = {
  free: "Free",
  pro: "Pro",
  pro_max: "Pro Max",
  author: "Author",
};

export const ACTION_LABEL: Record<QuotaAction, string> = {
  ai_chat: "AI chat",
  ai_feedback: "Writing feedback",
  ai_rephrase: "Sentence rephrase",
  word_save: "Word saves",
  speaking_attempt: "Speaking attempts",
  game_spell: "Spell game",
  game_sentence: "Sentence game",
  game_synonym: "Synonym game",
  game_quiz: "Quiz game",
};

export const INPUT_CAPS = {
  ai_chat: { words: 20, chars: 150 },
  ai_feedback: { words: 50, chars: 200 },
  ai_rephrase: { words: 30, chars: 200 },
  speaking_attempt: { seconds: 60 },
} as const;

export function limitFor(tier: Tier, action: QuotaAction): number {
  const multiplier = TIER_MULTIPLIER[tier];
  if (multiplier === Infinity) return Infinity;
  return FREE_LIMITS[action] * multiplier;
}

export function isUnlimited(tier: Tier): boolean {
  return TIER_MULTIPLIER[tier] === Infinity;
}

export function nextResetAt(now = new Date()): Date {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return next;
}
