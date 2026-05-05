## Why

Phase 5 of `Project-plan/fullPlane.md` — `feature/grammar-lab`. Vocabulary and games (Phases 2–4) handle words; many learners also need structured grammar, especially the 12 English tenses. The schema reserves `grammar_lessons` and `lesson_progress` tables for exactly this.

## What Changes

- Seed `grammar_lessons` with the 12 tenses (present simple → future perfect continuous) and a small set of foundational topics (articles, prepositions, conditionals) via a new SQL migration `003_grammar_seed.sql`.
- Implement `GET /api/grammar/lessons?level=<a1..c2>` — list lessons filtered by CEFR level.
- Implement `GET /api/grammar/lessons/[slug]` — fetch one lesson's content (markdown body + structured exercises).
- Implement `POST /api/grammar/progress` — accepts `{ lesson_id, score, completed: boolean }` and upserts a `lesson_progress` row for the user.
- Build `(dashboard)/grammar` UI: lesson list filtered by the user's `profiles.level`, lesson detail page rendering markdown + interactive fill-in-the-blank exercises, completion mark on submit.
- Add a `lib/grammar/exercises.ts` runtime that scores fill-in-the-blank, multiple-choice, and reorder exercises client-side, with the canonical answers stored alongside the lesson body.
- Render lesson markdown via `react-markdown` (small, locked dependency added in this phase).

Out of scope: AI-generated grammar exercises (deferred), conversation-based grammar drills (Phase 6 territory), user-authored lessons.

## Capabilities

### New Capabilities

- `grammar-lessons`: lesson catalog (list + detail endpoints) and the seeded content for 12 tenses + foundational topics.
- `grammar-progress`: per-user completion tracking and the progress endpoint.
- `grammar-exercises`: client-side exercise runtime (fill-in, multiple-choice, reorder).

### Modified Capabilities

None.

## Impact

- **Code (new)**: `supabase/migrations/003_grammar_seed.sql`; `src/app/api/grammar/lessons/route.ts`; `src/app/api/grammar/lessons/[slug]/route.ts`; `src/app/api/grammar/progress/route.ts`; `src/app/(dashboard)/grammar/page.tsx`, `src/app/(dashboard)/grammar/[slug]/page.tsx`; `src/components/grammar/{lesson-list.tsx,lesson-renderer.tsx,exercise-runner.tsx}`; `src/lib/grammar/exercises.ts`; `src/lib/schemas/grammar.ts`.
- **Code (modified)**: dashboard nav adds Grammar link.
- **Dependencies**: `react-markdown`, `remark-gfm`. Both in the broader Next.js ecosystem; not yet in the locked stack — flag in PR.
- **Database**: new migration adds seed data only (INSERTs into `grammar_lessons`). No schema changes.
- **Free-tier risk**: lesson content is small text in Postgres — negligible.
- **Downstream**: Phase 7 stats include grammar progress; Phase 8 streak/XP can reward lesson completion.
