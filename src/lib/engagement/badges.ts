import type { SupabaseClient } from "@supabase/supabase-js";

const BADGE_RULES: {
  key: string;
  check: (client: SupabaseClient, userId: string) => Promise<boolean>;
}[] = [
  {
    key: "first_word",
    check: async (c, uid) => {
      const { count } = await c
        .from("user_words")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid);
      return (count ?? 0) >= 1;
    },
  },
  {
    key: "ten_words",
    check: async (c, uid) => {
      const { count } = await c
        .from("user_words")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid);
      return (count ?? 0) >= 10;
    },
  },
  {
    key: "first_review",
    check: async (c, uid) => {
      const { count } = await c
        .from("user_xp_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .eq("source", "review");
      return (count ?? 0) >= 1;
    },
  },
  {
    key: "seven_day_streak",
    check: async (c, uid) => {
      const { data } = await c
        .from("profiles")
        .select("streak_count")
        .eq("id", uid)
        .maybeSingle();
      return ((data as { streak_count: number } | null)?.streak_count ?? 0) >= 7;
    },
  },
  {
    key: "first_lesson",
    check: async (c, uid) => {
      const { count } = await c
        .from("lesson_progress")
        .select("user_id", { count: "exact", head: true })
        .eq("user_id", uid)
        .not("completed_at", "is", null);
      return (count ?? 0) >= 1;
    },
  },
  {
    key: "first_speaking",
    check: async (c, uid) => {
      const { count } = await c
        .from("speaking_recordings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid);
      return (count ?? 0) >= 1;
    },
  },
];

export async function evaluateBadges(client: SupabaseClient, userId: string): Promise<void> {
  // Fetch already-earned badges to avoid re-checking
  const { data: existing } = await client
    .from("user_badges")
    .select("badge_key")
    .eq("user_id", userId);

  const earned = new Set(
    (existing ?? []).map((r: { badge_key: string }) => r.badge_key),
  );

  const toInsert: { user_id: string; badge_key: string }[] = [];

  for (const rule of BADGE_RULES) {
    if (earned.has(rule.key)) continue;
    const met = await rule.check(client, userId);
    if (met) toInsert.push({ user_id: userId, badge_key: rule.key });
  }

  if (toInsert.length === 0) return;

  // ignoreDuplicates: true makes this idempotent on the unique PK
  await client
    .from("user_badges")
    .upsert(toInsert, { onConflict: "user_id,badge_key", ignoreDuplicates: true });
}
