## Context

`grammar_lessons` and `lesson_progress` exist; this phase fills them with content and ships endpoints + UI. Content is the bulk of work — three endpoints are thin.

## Goals

- 16 seeded lessons (12 tenses + 4 foundational topics) good enough to ship.
- Three independently apply-able fetches.
- Exercise runtime that we can extend later without refactoring.

## Non-Goals

- AI-authored lessons or AI-graded exercises.
- Spaced repetition for grammar items.
- Multi-language lesson content.

## Decisions

### Decision: Lesson content lives in the migration, not in repo markdown files

Pros: single source of truth, RLS-compatible, queryable. Cons: editing requires a new migration. Acceptable because content stabilizes after seeding; future tweaks are typo-level and warrant migrations anyway.

### Decision: Exercises stored as JSONB on each lesson row

Avoids a separate `grammar_exercises` table for MVP. JSONB is queryable and Zod-validatable on read. If exercises grow per-user metadata (mistake history), we'll split the table later.

### Decision: 70% threshold for "completed"

Picked from common pedagogy. Configurable later via `profiles` if needed. Documented so reviewers know it's not a magic constant.

### Decision: `react-markdown` + `remark-gfm`

Smallest bundle that supports tables and task lists. Sanitization is on by default. Flagged in proposal because it adds two dependencies; reviewers should accept before merge.

## Risks / Trade-offs

- **Content quality**: 16 seed lessons is real writing work. Estimate one focused day to draft + review. Acceptable for a 3-4-day phase budget.
- **Exercise rigidity**: case-insensitive trim is too lenient for some grammar (e.g., capitalization at sentence start). MVP — iterate if learners complain.

## Migration Plan

`003_grammar_seed.sql` inserts ~16 rows. Idempotent via `on conflict (slug) do nothing`. No data backfill.
