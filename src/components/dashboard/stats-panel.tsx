"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProgressDashboard } from "@/lib/schemas/progress";

export function StatsPanels({ stats }: { stats: ProgressDashboard }) {
  const gameData = [
    { game: "Spell", plays: stats.games.spell.plays },
    { game: "Sentence", plays: stats.games.sentence.plays },
    { game: "Synonym", plays: stats.games.synonym.plays },
    { game: "Quiz", plays: stats.games.quiz.plays },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <h3 className="font-semibold">Words</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Saved" value={stats.words.saved} />
          <Stat label="Mastered" value={stats.words.mastered} />
          <Stat label="Due today" value={stats.words.due_today} />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-3">
        <h3 className="font-semibold">Games played</h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gameData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="game" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="plays" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-3">
        <h3 className="font-semibold">Grammar</h3>
        <p className="text-2xl font-mono">
          {stats.grammar.lessons_completed}
          <span className="text-muted-foreground text-base"> / {stats.grammar.total_lessons}</span>
        </p>
        <p className="text-sm text-muted-foreground">lessons completed</p>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-3">
        <h3 className="font-semibold">Speaking & AI</h3>
        <div className="grid grid-cols-2 gap-2 text-center">
          <Stat label="Recordings" value={stats.speaking.attempts} />
          <Stat
            label="Avg accuracy"
            value={
              stats.speaking.avg_accuracy != null
                ? `${stats.speaking.avg_accuracy}%`
                : "—"
            }
          />
          <Stat label="Conversations" value={stats.ai.conversations} />
          <Stat label="Streak" value={`${stats.streak.current_days}d`} />
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div>
      <p className="text-2xl font-mono">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
