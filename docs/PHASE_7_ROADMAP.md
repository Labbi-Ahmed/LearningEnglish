# Phase 7 — Roadmap & Progress

## Status: Implementation complete (manual smoke + Vercel preview pending)

## What was built

### Routes added

| Route | Type | Purpose |
|---|---|---|
| `POST /api/profile/placement` | API | Score a 13-question placement test, write `profiles.level` |
| `GET /api/progress/dashboard` | API | Aggregate stats for the authenticated user |
| `/placement` | Page | 13-question placement runner (vocab + grammar + listening + reading) |
| `/dashboard` | Page (rewritten) | Greeting + level chip + due badge + recommended-next + stats panels |
| `/roadmap` | Page | Read-only 5-step path: vocabulary → games → grammar → speaking → AI |

### Files

- `src/lib/schemas/placement.ts`, `src/lib/schemas/progress.ts`
- `src/lib/placement/questions.ts` — 13-question static bank
- `src/lib/placement/score.ts` — percentage → CEFR band
- `src/lib/roadmap/thresholds.ts` — single source of truth for step state + recommendations
- `src/components/dashboard/{level-chip,recommended-next,stats-panel}.tsx`
- `src/app/(dashboard)/placement/{page,placement-runner}.tsx`
- `src/app/(dashboard)/roadmap/page.tsx`

### Decisions

- **Static placement bank**: 13 hand-curated questions in source code. Not generated.
- **One stats payload**: dashboard issues a single aggregated read, not 6 small ones.
- **Streak placeholder**: `streak.current_days = 0` until Phase 8 owns the streak column.
- **Recommendation = rule cascade**: placement → save first word → review due → next grammar lesson.

### Database

No schema change. Reads from `user_words`, `game_sessions`, `lesson_progress`, `grammar_lessons`, `speaking_recordings`, `ai_conversations`. Writes only to `profiles.level`.

### Dependencies added

- `recharts` (locked-stack pick for charts)

## Manual verification

1. Sign in as a fresh user → dashboard shows zeros and a "Take the placement test" CTA.
2. `/placement` → answer 13 questions → finish → `profiles.level` updates and dashboard reflects it.
3. Save a few words / play a game → revisit `/dashboard` and `/roadmap` → counts and step states update.
