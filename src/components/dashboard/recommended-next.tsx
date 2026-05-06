import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ProgressDashboard } from "@/lib/schemas/progress";

type Recommendation = {
  title: string;
  description: string;
  href: string;
  cta: string;
};

export function recommendNext(
  stats: ProgressDashboard,
  hasAnyActivity: boolean,
): Recommendation {
  // Rule cascade — order matters.
  if (stats.level === "a1" && !hasAnyActivity) {
    return {
      title: "Take the 5-minute placement test",
      description:
        "Get a CEFR level so we can recommend the right lessons and games.",
      href: "/placement",
      cta: "Start placement",
    };
  }
  if (stats.words.saved === 0) {
    return {
      title: "Look up and save your first word",
      description:
        "Building your word bank unlocks the games and the daily review queue.",
      href: "/vocabulary",
      cta: "Look up a word",
    };
  }
  if (stats.words.due_today > 0) {
    return {
      title: `Review ${stats.words.due_today} word${stats.words.due_today === 1 ? "" : "s"}`,
      description: "Spaced repetition works best when you keep the streak going.",
      href: "/review",
      cta: "Start review",
    };
  }
  return {
    title: "Continue your grammar lessons",
    description: "Pick the next un-completed lesson at your level.",
    href: "/grammar",
    cta: "Open grammar",
  };
}

export function RecommendedNext({
  stats,
  hasAnyActivity,
}: {
  stats: ProgressDashboard;
  hasAnyActivity: boolean;
}) {
  const r = recommendNext(stats, hasAnyActivity);
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <h3 className="font-semibold">Recommended next</h3>
      <p className="font-medium">{r.title}</p>
      <p className="text-sm text-muted-foreground">{r.description}</p>
      <Button asChild>
        <Link href={r.href}>{r.cta}</Link>
      </Button>
    </div>
  );
}
