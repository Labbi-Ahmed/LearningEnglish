import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { LeaderboardRow } from "@/lib/schemas/engagement";

async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/leaderboard/weekly?limit=20`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json() as Promise<LeaderboardRow[]>;
}

const LEVEL_LABELS: Record<string, string> = {
  a1: "A1", a2: "A2", b1: "B1", b2: "B2", c1: "C1", c2: "C2",
};

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rows = await getLeaderboard();

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Weekly Leaderboard</h1>
        <p className="text-sm text-muted-foreground">Top learners by XP earned in the past 7 days</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground">No activity this week yet. Be the first!</p>
      ) : (
        <ol className="space-y-2">
          {rows.map((row, i) => (
            <li
              key={i}
              className={`flex items-center gap-4 rounded-xl border px-5 py-3 ${
                row.is_self ? "border-primary bg-primary/5" : "bg-card"
              }`}
            >
              <span className="w-6 text-center font-bold text-muted-foreground">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {row.display_name}
                  {row.is_self && <span className="ml-2 text-xs text-primary">(you)</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {LEVEL_LABELS[row.level] ?? row.level.toUpperCase()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold">+{row.weekly_xp}</p>
                <p className="text-xs text-muted-foreground">XP</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
