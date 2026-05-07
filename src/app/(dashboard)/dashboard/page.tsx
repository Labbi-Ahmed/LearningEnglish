import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LevelChip } from "@/components/dashboard/level-chip";
import { StatsPanels } from "@/components/dashboard/stats-panel";
import { RecommendedNext } from "@/components/dashboard/recommended-next";
import { StreakStrip } from "@/components/engagement/streak-strip";
import { BadgeGrid } from "@/components/engagement/badge-grid";
import { InstallCta } from "@/components/engagement/install-cta";
import { PushPrompt } from "@/components/engagement/push-prompt";
import { Button } from "@/components/ui/button";
import type { ProgressDashboard } from "@/lib/schemas/progress";
import type { CefrLevel } from "@/lib/schemas/placement";
import type { Badge } from "@/lib/schemas/engagement";

async function fetchDashboardStats(): Promise<ProgressDashboard | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const nowIso = new Date().toISOString();
  const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    profileRes,
    wordsSavedRes,
    wordsMasteredRes,
    wordsDueRes,
    gameRowsRes,
    lessonsCompletedRes,
    totalLessonsRes,
    speakingRes,
    aiCountRes,
    weeklyXpRes,
    badgesRes,
  ] = await Promise.all([
    supabase.from("profiles").select("level, streak_count, xp").eq("id", user.id).maybeSingle(),
    supabase.from("user_words").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("user_words")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("repetitions", 4),
    supabase
      .from("user_words")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .lte("next_review_at", nowIso),
    supabase
      .from("game_sessions")
      .select("game_type, score")
      .eq("user_id", user.id),
    supabase
      .from("lesson_progress")
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("completed", true),
    supabase.from("grammar_lessons").select("id", { count: "exact", head: true }),
    supabase
      .from("speaking_recordings")
      .select("accuracy_score")
      .eq("user_id", user.id),
    supabase
      .from("ai_conversations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("user_xp_events")
      .select("amount")
      .eq("user_id", user.id)
      .gte("created_at", weekAgoIso),
    supabase
      .from("user_badges")
      .select("badge_key, created_at")
      .eq("user_id", user.id),
  ]);

  type ProfileRow = { level: string; streak_count: number | null; xp: number | null };
  const profile = profileRes.data as ProfileRow | null;
  const level = (profile?.level ?? "a1") as CefrLevel;
  const streakDays = profile?.streak_count ?? 0;
  const xpTotal = profile?.xp ?? 0;

  const weeklyXpRows = (weeklyXpRes.data ?? []) as { amount: number }[];
  const xpThisWeek = weeklyXpRows.reduce((sum, r) => sum + r.amount, 0);

  type BadgeRow = { badge_key: string; created_at: string };
  const badges: Badge[] = ((badgesRes.data ?? []) as unknown as BadgeRow[]).map((r) => ({
    key: r.badge_key,
    earned_at: r.created_at,
  }));

  const games = { spell: 0, sentence: 0, synonym: 0, quiz: 0 } as Record<string, number>;
  const totals = { spell: 0, sentence: 0, synonym: 0, quiz: 0 } as Record<string, number>;
  for (const row of (gameRowsRes.data ?? []) as { game_type: string; score: number | null }[]) {
    if (row.game_type in games) {
      games[row.game_type] = (games[row.game_type] ?? 0) + 1;
      totals[row.game_type] = (totals[row.game_type] ?? 0) + (row.score ?? 0);
    }
  }
  const avg = (k: string) =>
    (games[k] ?? 0) > 0
      ? Number(((totals[k] ?? 0) / (games[k] ?? 1)).toFixed(2))
      : null;

  const speakingRows = (speakingRes.data ?? []) as { accuracy_score: number | null }[];
  const speakingScores = speakingRows
    .map((r) => r.accuracy_score)
    .filter((v): v is number => v != null);
  const speakingAvg =
    speakingScores.length > 0
      ? Number((speakingScores.reduce((a, b) => a + b, 0) / speakingScores.length).toFixed(2))
      : null;

  return {
    level,
    words: {
      saved: wordsSavedRes.count ?? 0,
      mastered: wordsMasteredRes.count ?? 0,
      due_today: wordsDueRes.count ?? 0,
    },
    games: {
      spell:    { plays: games.spell    ?? 0, avg_score: avg("spell") },
      sentence: { plays: games.sentence ?? 0, avg_score: avg("sentence") },
      synonym:  { plays: games.synonym  ?? 0, avg_score: avg("synonym") },
      quiz:     { plays: games.quiz     ?? 0, avg_score: avg("quiz") },
    },
    grammar: {
      lessons_completed: lessonsCompletedRes.count ?? 0,
      total_lessons: totalLessonsRes.count ?? 0,
    },
    speaking: { attempts: speakingRows.length, avg_accuracy: speakingAvg },
    ai: { conversations: aiCountRes.count ?? 0 },
    streak: { current_days: streakDays },
    xp: { total: xpTotal, this_week: xpThisWeek },
    badges,
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const stats = await fetchDashboardStats();
  if (!stats) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name")
    .eq("id", user.id)
    .single();
  const firstName = profile?.first_name?.trim() || "";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const hasAnyActivity =
    stats.words.saved > 0 ||
    stats.grammar.lessons_completed > 0 ||
    stats.games.spell.plays + stats.games.sentence.plays + stats.games.synonym.plays + stats.games.quiz.plays > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            Keep your streak going — let&apos;s learn something new today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LevelChip level={stats.level} />
          {stats.words.due_today > 0 && (
            <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
              {stats.words.due_today} due today
            </span>
          )}
        </div>
      </div>

      <StreakStrip
        currentDays={stats.streak.current_days}
        xpTotal={stats.xp.total}
        xpThisWeek={stats.xp.this_week}
      />

      <InstallCta />
      <PushPrompt />

      {stats.level === "a1" && !hasAnyActivity && (
        <div className="rounded-xl border bg-primary/5 p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-medium">Find your level</p>
            <p className="text-sm text-muted-foreground">
              A 5-minute placement test sets your CEFR level.
            </p>
          </div>
          <Button asChild>
            <Link href="/placement">Take the placement test</Link>
          </Button>
        </div>
      )}

      <RecommendedNext stats={stats} hasAnyActivity={hasAnyActivity} />

      <StatsPanels stats={stats} />

      <BadgeGrid badges={stats.badges} />
    </div>
  );
}
