import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ProgressDashboard } from "@/lib/schemas/progress";
import type { CefrLevel } from "@/lib/schemas/placement";

type GameRow = { game_type: string; score: number | null };

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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

  const games = { spell: 0, sentence: 0, synonym: 0, quiz: 0 } as Record<
    string,
    number
  >;
  const gameTotals = { spell: 0, sentence: 0, synonym: 0, quiz: 0 } as Record<
    string,
    number
  >;
  for (const row of (gameRowsRes.data ?? []) as GameRow[]) {
    if (row.game_type in games) {
      games[row.game_type] = (games[row.game_type] ?? 0) + 1;
      gameTotals[row.game_type] =
        (gameTotals[row.game_type] ?? 0) + (row.score ?? 0);
    }
  }
  const avg = (key: string) =>
    (games[key] ?? 0) > 0
      ? Number(((gameTotals[key] ?? 0) / (games[key] ?? 1)).toFixed(2))
      : null;

  const speakingRows = (speakingRes.data ?? []) as { accuracy_score: number | null }[];
  const speakingScores = speakingRows
    .map((r) => r.accuracy_score)
    .filter((v): v is number => v != null);
  const speakingAvg =
    speakingScores.length > 0
      ? Number(
          (
            speakingScores.reduce((a, b) => a + b, 0) / speakingScores.length
          ).toFixed(2),
        )
      : null;

  const payload: ProgressDashboard = {
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
    speaking: {
      attempts: speakingRows.length,
      avg_accuracy: speakingAvg,
    },
    ai: {
      conversations: aiCountRes.count ?? 0,
    },
    streak: {
      current_days: 0, // placeholder until Phase 8
    },
  };

  return NextResponse.json(payload, { status: 200 });
}
