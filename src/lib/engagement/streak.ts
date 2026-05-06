import type { SupabaseClient } from "@supabase/supabase-js";

type XpEventRow = { created_at: string };

export async function recomputeStreak(client: SupabaseClient, userId: string): Promise<number> {
  const { data } = await client
    .from("user_xp_events")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const events = (data ?? []) as unknown as XpEventRow[];

  // Unique UTC date strings, sorted descending
  const days = [
    ...new Set(events.map((e) => e.created_at.slice(0, 10))),
  ].sort().reverse();

  const today = new Date().toISOString().slice(0, 10);
  let streak = 0;
  let expected = today;

  for (const day of days) {
    if (day === expected) {
      streak++;
      const d = new Date(expected + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() - 1);
      expected = d.toISOString().slice(0, 10);
    } else if (day < expected) {
      break;
    }
  }

  await client
    .from("profiles")
    .update({ streak_count: streak, last_active_at: new Date().toISOString() })
    .eq("id", userId);

  return streak;
}
