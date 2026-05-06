import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deriveRoadmap, type RoadmapStep } from "@/lib/roadmap/thresholds";
import type { ProgressDashboard } from "@/lib/schemas/progress";
import type { CefrLevel } from "@/lib/schemas/placement";

async function fetchStats(): Promise<ProgressDashboard | null> {
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

  const level = ((profileRes.data as { level: string } | null)?.level ?? "a1") as CefrLevel;

  const games = { spell: 0, sentence: 0, synonym: 0, quiz: 0 } as Record<string, number>;
  for (const row of (gameRowsRes.data ?? []) as { game_type: string }[]) {
    if (row.game_type in games) games[row.game_type] = (games[row.game_type] ?? 0) + 1;
  }

  const speakingRows = (speakingRes.data ?? []) as { accuracy_score: number | null }[];

  return {
    level,
    words: {
      saved: wordsSavedRes.count ?? 0,
      mastered: wordsMasteredRes.count ?? 0,
      due_today: wordsDueRes.count ?? 0,
    },
    games: {
      spell:    { plays: games.spell    ?? 0, avg_score: null },
      sentence: { plays: games.sentence ?? 0, avg_score: null },
      synonym:  { plays: games.synonym  ?? 0, avg_score: null },
      quiz:     { plays: games.quiz     ?? 0, avg_score: null },
    },
    grammar: {
      lessons_completed: lessonsCompletedRes.count ?? 0,
      total_lessons: totalLessonsRes.count ?? 0,
    },
    speaking: { attempts: speakingRows.length, avg_accuracy: null },
    ai: { conversations: aiCountRes.count ?? 0 },
    streak: { current_days: 0 },
  };
}

const STATE_STYLES: Record<RoadmapStep["state"], { bg: string; ring: string; label: string }> = {
  complete:   { bg: "bg-green-500",  ring: "ring-green-500/30",  label: "Complete" },
  in_progress:{ bg: "bg-primary",    ring: "ring-primary/30",    label: "In progress" },
  locked:     { bg: "bg-muted-foreground/40", ring: "ring-transparent", label: "Locked" },
};

export default async function RoadmapPage() {
  const stats = await fetchStats();
  if (!stats) redirect("/login");

  const steps = deriveRoadmap(stats);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Your roadmap</h1>
        <p className="text-sm text-muted-foreground">
          A guided path through the app. Each step unlocks naturally as you use
          the features.
        </p>
      </div>

      <ol className="space-y-3">
        {steps.map((step, i) => {
          const style = STATE_STYLES[step.state];
          return (
            <li
              key={step.key}
              className={`rounded-xl border bg-card p-5 flex items-center gap-4 ring-1 ${style.ring}`}
            >
              <div
                className={`flex-none h-9 w-9 rounded-full ${style.bg} text-white font-mono flex items-center justify-center`}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Link href={step.href} className="font-medium hover:underline">
                    {step.label}
                  </Link>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    {style.label}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{step.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
