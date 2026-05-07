// Single source of truth for roadmap step state and dashboard recommendations.
// Both /roadmap and the recommendation logic on /dashboard read these constants
// so they cannot drift.

import type { ProgressDashboard } from "@/lib/schemas/progress";

export type RoadmapStepKey =
  | "vocabulary"
  | "games"
  | "grammar"
  | "speaking"
  | "ai";

export type RoadmapStepState = "locked" | "in_progress" | "complete";

export type RoadmapStep = {
  key: RoadmapStepKey;
  label: string;
  href: string;
  state: RoadmapStepState;
  detail: string;
};

// Threshold constants. Easy to tune.
export const THRESHOLDS = {
  vocabulary: { complete: 10 },              // saved words
  games:      { in_progress: 1, complete: 5 }, // any single game's plays
  grammar:    { in_progress: 1, complete: 4 }, // lessons completed
  speaking:   { in_progress: 1, complete: 5 }, // attempts
  ai:         { in_progress: 1, complete: 5 }, // conversations
} as const;

export function deriveRoadmap(stats: ProgressDashboard): RoadmapStep[] {
  const maxGamePlays = Math.max(
    stats.games.spell.plays,
    stats.games.sentence.plays,
    stats.games.synonym.plays,
    stats.games.quiz.plays,
  );

  const vocab: RoadmapStep = {
    key: "vocabulary",
    label: "Vocabulary",
    href: "/vocabulary",
    state:
      stats.words.saved >= THRESHOLDS.vocabulary.complete
        ? "complete"
        : stats.words.saved > 0
          ? "in_progress"
          : "locked",
    detail: `${stats.words.saved} saved · target ${THRESHOLDS.vocabulary.complete}`,
  };

  const games: RoadmapStep = {
    key: "games",
    label: "Games",
    href: "/games",
    state:
      maxGamePlays >= THRESHOLDS.games.complete
        ? "complete"
        : maxGamePlays >= THRESHOLDS.games.in_progress
          ? "in_progress"
          : "locked",
    detail: `${maxGamePlays} best run · target ${THRESHOLDS.games.complete}`,
  };

  const grammar: RoadmapStep = {
    key: "grammar",
    label: "Grammar",
    href: "/grammar",
    state:
      stats.grammar.lessons_completed >= THRESHOLDS.grammar.complete
        ? "complete"
        : stats.grammar.lessons_completed >= THRESHOLDS.grammar.in_progress
          ? "in_progress"
          : "locked",
    detail: `${stats.grammar.lessons_completed} / ${stats.grammar.total_lessons} lessons`,
  };

  const speaking: RoadmapStep = {
    key: "speaking",
    label: "Speaking",
    href: "/speaking",
    state:
      stats.speaking.attempts >= THRESHOLDS.speaking.complete
        ? "complete"
        : stats.speaking.attempts >= THRESHOLDS.speaking.in_progress
          ? "in_progress"
          : "locked",
    detail: `${stats.speaking.attempts} attempts · target ${THRESHOLDS.speaking.complete}`,
  };

  const ai: RoadmapStep = {
    key: "ai",
    label: "AI Practice",
    href: "/chat",
    state:
      stats.ai.conversations >= THRESHOLDS.ai.complete
        ? "complete"
        : stats.ai.conversations >= THRESHOLDS.ai.in_progress
          ? "in_progress"
          : "locked",
    detail: `${stats.ai.conversations} conversations · target ${THRESHOLDS.ai.complete}`,
  };

  return [vocab, games, grammar, speaking, ai];
}
