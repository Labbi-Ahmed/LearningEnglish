import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LevelChip } from "@/components/dashboard/level-chip";
import { StatsPanels } from "@/components/dashboard/stats-panel";
import { RecommendedNext } from "@/components/dashboard/recommended-next";
import { Button } from "@/components/ui/button";
import type { ProgressDashboard } from "@/lib/schemas/progress";
import type { CefrLevel } from "@/lib/schemas/placement";

async function fetchDashboardStats(): Promise<ProgressDashboard | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const nowIso = new Date().toISOString();

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
  ] = await Promise.all([
    supabase.from("profiles").select("level").eq("id", user.id).maybeSingle(),
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
  ]);

  const level = ((profileRes.data as { level: string } | null)?.level ??
    "a1") as CefrLevel;

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
    streak: { current_days: 0 },
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const stats = await fetchDashboardStats();
  if (!stats) redirect("/login");

  const hasAnyActivity =
    stats.words.saved > 0 ||
    stats.grammar.lessons_completed > 0 ||
    stats.games.spell.plays + stats.games.sentence.plays + stats.games.synonym.plays + stats.games.quiz.plays > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium">{user.email}</span>
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
    </div>
  );
}
