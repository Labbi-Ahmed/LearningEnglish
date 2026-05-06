import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LeaderboardQuerySchema } from "@/lib/schemas/engagement";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = LeaderboardQuerySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }
  const { limit } = parsed.data;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Aggregate weekly XP per user — RLS allows reading own events only,
  // so we use a public leaderboard view sourced from profiles.
  // We fetch profiles (public display data) + join weekly XP sum.
  const { data: rows, error } = await supabase
    .from("user_xp_events")
    .select("user_id, amount")
    .gte("created_at", weekAgoIso);

  if (error) {
    console.error("[leaderboard] xp_events fetch failed:", error.message);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  // Aggregate weekly XP per user
  const xpMap = new Map<string, number>();
  for (const row of (rows ?? []) as { user_id: string; amount: number }[]) {
    xpMap.set(row.user_id, (xpMap.get(row.user_id) ?? 0) + row.amount);
  }

  // Sort by weekly XP desc, take top `limit`
  const topUserIds = [...xpMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  if (topUserIds.length === 0) {
    return NextResponse.json([], { status: 200 });
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name, level")
    .in("id", topUserIds);

  if (profilesError) {
    console.error("[leaderboard] profiles fetch failed:", profilesError.message);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  type ProfileRow = { id: string; display_name: string | null; level: string | null };
  const profileMap = new Map(
    ((profiles ?? []) as unknown as ProfileRow[]).map((p) => [p.id, p]),
  );

  const leaderboard = topUserIds.map((uid) => {
    const p = profileMap.get(uid);
    return {
      display_name: p?.display_name ?? "Learner",
      level: p?.level ?? "a1",
      weekly_xp: xpMap.get(uid) ?? 0,
      is_self: uid === user.id,
    };
  });

  return NextResponse.json(leaderboard, { status: 200 });
}
