## Why

Phase 7 of `Project-plan/fullPlane.md` — `feature/roadmap-progress`. With words, games, grammar, speaking, and AI now in place, learners need (a) a placement test that sets `profiles.level` correctly and (b) a dashboard view of their stats and a guided path of "what to do next." Without this, the app is a pile of tools with no narrative.

## What Changes

- Build a placement test at `(dashboard)/placement` — 12–15 questions spanning vocabulary, grammar, and listening; outputs a recommended CEFR level and writes it to `profiles.level`. Skippable; can be retaken.
- Implement `POST /api/profile/placement` — accepts `{ answers: [{ question_id, answer }] }`, scores server-side, updates `profiles.level`, and returns the new level + breakdown.
- Implement `GET /api/progress/dashboard` — returns aggregated user stats: words saved, words mastered (`repetitions >= 4`), games played per type with average score, lessons completed, speaking attempts, current streak (placeholder until Phase 8 owns streak), AI conversations count.
- Build a richer `(dashboard)/dashboard` home: greeting, level chip, "due today" badge (from Phase 4), stats panels (charts via Recharts), and a "Recommended next" panel that suggests one of: take placement, save your first word, complete today's review, finish a grammar lesson, or try the speaking practice.
- Add a learning-path UI at `(dashboard)/roadmap` — a vertical list of phases (`vocabulary → games → grammar → speaking → AI`) with per-phase completion derived from stats; primarily a motivational view.
- Install `recharts` (locked in stack but not yet added).

Out of scope: leaderboards beyond a stub (`Phase 8` may extend), AI-suggested study plans, paid coaching.

## Capabilities

### New Capabilities

- `placement-test`: question bank, scoring, level write, retake flow.
- `progress-stats`: aggregated stats endpoint and the dashboard panels that render it.
- `learning-roadmap`: read-only roadmap UI synthesizing stats into a guided path.

### Modified Capabilities

None at the spec level. The dashboard home (currently a placeholder) is replaced; this is implementation, not a spec contract change.

## Impact

- **Code (new)**: `src/app/api/profile/placement/route.ts`; `src/app/api/progress/dashboard/route.ts`; `src/app/(dashboard)/placement/page.tsx`; `src/app/(dashboard)/roadmap/page.tsx`; `src/components/dashboard/{stats-panel.tsx,recommended-next.tsx,level-chip.tsx}`; `src/lib/placement/{questions.ts,score.ts}`; `src/lib/schemas/{placement,progress}.ts`.
- **Code (modified)**: `(dashboard)/dashboard/page.tsx` rewritten; nav adds Roadmap link.
- **Dependencies**: `recharts`.
- **Database**: no schema change. Reads from `user_words`, `game_sessions`, `lesson_progress`, `speaking_recordings`, `ai_conversations`. Writes only to `profiles.level`.
- **Free-tier risk**: queries are bounded; aggregate counts on indexed columns.
- **Downstream**: Phase 8 reuses the stats endpoint to compute streak/XP triggers.
