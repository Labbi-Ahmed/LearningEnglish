# Phase 5 — Grammar Lab

## Status: Implementation complete (migration + lint/typecheck pending)

## What was built

### Content
16 seeded lessons in `supabase/migrations/003_grammar_seed.sql`:
- **12 tenses**: Present/Past/Future × Simple/Continuous/Perfect/Perfect-Continuous across A1–B2
- **4 foundational topics**: Articles (A1), Prepositions (A2), Modal Verbs (A2), Conditionals (B1)

Each lesson has a markdown body and 5 structured exercises.

### Routes added

| Route | Type | Purpose |
|---|---|---|
| `GET /api/grammar/lessons` | API | List lessons by CEFR level (defaults to user's profile level) |
| `GET /api/grammar/lessons/[slug]` | API | Fetch one lesson's body + exercises |
| `POST /api/grammar/progress` | API | Upsert progress: keeps MAX(score), never clears completed_at |
| `/grammar` | Page | Hub — lesson cards with completion state |
| `/grammar/[slug]` | Page | Lesson detail — markdown body + exercise runner |

### Library files added

| File | Purpose |
|---|---|
| `src/lib/schemas/grammar.ts` | Zod schemas for exercises, lessons, progress body |
| `src/lib/grammar/exercises.ts` | scoreItem() + scoreLesson() runtime |

### Components added

| File | Purpose |
|---|---|
| `src/components/grammar/lesson-list.tsx` | Lesson cards with completion badges |
| `src/components/grammar/lesson-renderer.tsx` | Markdown renderer (react-markdown + remark-gfm) |
| `src/components/grammar/exercise-runner.tsx` | Interactive fill-in-blank, multiple-choice, reorder |

### Files modified
- `src/app/(dashboard)/layout.tsx` — Grammar nav link added
- `package.json` — added `react-markdown`, `remark-gfm`

## Key design decisions

- **Content in JSONB**: `grammar_lessons.content = { body: string, exercises: ExerciseItem[] }` — queryable, no extra table needed for MVP.
- **70% threshold for completion**: configurable constant in exercise-runner.tsx.
- **Progress upsert**: fetch-then-upsert pattern keeps MAX(score) and never clears `completed_at` once set.
- **Scoring is client-side**: `lib/grammar/exercises.ts` runs in the browser, server only persists the result.
- **Category → topic mapping**: DB column is `category`, API response exposes it as `topic`.

## Before deploying

1. Run `003_grammar_seed.sql` in Supabase dashboard (SQL Editor → paste → Run)
2. Verify: `select count(*) from grammar_lessons;` → should return ≥ 16
3. Run `npm run lint && npm run typecheck`
4. Smoke test: sign in → `/grammar` → open a lesson → complete exercises → hub shows "Completed"
