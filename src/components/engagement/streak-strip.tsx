"use client";

interface StreakStripProps {
  currentDays: number;
  xpTotal: number;
  xpThisWeek: number;
}

export function StreakStrip({ currentDays, xpTotal, xpThisWeek }: StreakStripProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card px-5 py-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🔥</span>
        <div>
          <p className="text-xl font-bold leading-none">{currentDays}</p>
          <p className="text-xs text-muted-foreground">day streak</p>
        </div>
      </div>
      <div className="h-8 w-px bg-border" />
      <div className="flex items-center gap-2">
        <span className="text-2xl">⚡</span>
        <div>
          <p className="text-xl font-bold leading-none">{xpTotal.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">total XP</p>
        </div>
      </div>
      <div className="h-8 w-px bg-border" />
      <div className="flex items-center gap-2">
        <span className="text-2xl">📅</span>
        <div>
          <p className="text-xl font-bold leading-none">+{xpThisWeek}</p>
          <p className="text-xs text-muted-foreground">XP this week</p>
        </div>
      </div>
    </div>
  );
}
