"use client";

import type { Badge } from "@/lib/schemas/engagement";

const BADGE_META: Record<string, { label: string; icon: string; description: string }> = {
  first_word:      { label: "First Word",      icon: "📖", description: "Saved your first vocabulary word" },
  ten_words:       { label: "Word Collector",   icon: "📚", description: "Saved 10 vocabulary words" },
  first_review:    { label: "Reviewer",         icon: "🔄", description: "Completed your first spaced-repetition review" },
  seven_day_streak:{ label: "Week Warrior",     icon: "🔥", description: "Maintained a 7-day learning streak" },
  first_lesson:    { label: "Grammar Student",  icon: "✏️", description: "Completed your first grammar lesson" },
  first_speaking:  { label: "Brave Speaker",    icon: "🎙️", description: "Submitted your first speaking recording" },
};

const ALL_KEYS = Object.keys(BADGE_META);

interface BadgeGridProps {
  badges: Badge[];
}

export function BadgeGrid({ badges }: BadgeGridProps) {
  const earnedSet = new Set(badges.map((b) => b.key));
  const earnedAt = Object.fromEntries(badges.map((b) => [b.key, b.earned_at]));

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Badges</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {ALL_KEYS.map((key) => {
          const meta = BADGE_META[key];
          if (!meta) return null;
          const earned = earnedSet.has(key);
          return (
            <div
              key={key}
              title={earned ? `${meta.description}\nEarned ${new Date(earnedAt[key] ?? "").toLocaleDateString()}` : meta.description}
              className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-opacity ${
                earned ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30" : "opacity-35"
              }`}
            >
              <span className="text-3xl">{meta.icon}</span>
              <span className="text-xs font-medium leading-tight">{meta.label}</span>
              {earned && (
                <span className="text-[10px] text-muted-foreground">
                  {new Date(earnedAt[key] ?? "").toLocaleDateString()}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
