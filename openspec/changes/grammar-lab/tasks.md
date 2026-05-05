> Apply groups in order. Groups 3, 4, 5 each isolate one fetch. Run lint + typecheck after every group.

## 1. Content + migration

- [x] 1.1 Draft markdown bodies + 5+ exercises each for 12 tenses (present/past/future × simple/continuous/perfect/perfect-continuous) and 4 foundational topics (articles, prepositions, conditionals, modal verbs). Use CEFR a1–b2 levels appropriately.
- [x] 1.2 Create `supabase/migrations/003_grammar_seed.sql` with `insert ... on conflict (slug) do nothing` for all 16 lessons.
- [ ] 1.3 Apply the migration via Supabase dashboard. Verify `select count(*) from grammar_lessons >= 16`.

## 2. Shared scaffolding

- [x] 2.1 Install `react-markdown` and `remark-gfm`.
- [x] 2.2 Create `src/lib/schemas/grammar.ts` with Zod schemas for lesson rows, exercise items (discriminated union), the list query, and the progress body.
- [x] 2.3 Create `src/lib/grammar/exercises.ts` with `scoreItem(item, answer)` and `scoreLesson(items, answers)`.
- [x] 2.4 Add a Grammar nav link.

## 3. FETCH #1 — `GET /api/grammar/lessons`

- [x] 3.1 Create `src/app/api/grammar/lessons/route.ts`. Validate query, default `level` to `profiles.level`. Return `401` if unauthenticated.
- [x] 3.2 Query `grammar_lessons` filtered by level; left-join `lesson_progress` for the caller to compute `completed`.
- [x] 3.3 Build `(dashboard)/grammar/page.tsx` rendering `<LessonList>` from this endpoint.
- [ ] 3.4 Manual smoke: list shows lessons matching the user's level with completion state.

## 4. FETCH #2 — `GET /api/grammar/lessons/[slug]`

- [x] 4.1 Create `src/app/api/grammar/lessons/[slug]/route.ts`. Return `401` if unauthenticated, `404` for unknown slug.
- [x] 4.2 Build `(dashboard)/grammar/[slug]/page.tsx` rendering `<LessonRenderer>` (markdown body) and `<ExerciseRunner>` (interactive exercises).
- [ ] 4.3 Manual smoke: open `/grammar/present-simple`, see the body, exercises render correctly per type.

## 5. FETCH #3 — `POST /api/grammar/progress`

- [x] 5.1 Create `src/app/api/grammar/progress/route.ts`. Validate body. Upsert keeping `max(score)` and never clearing `completed_at`.
- [x] 5.2 Wire `<ExerciseRunner>` submit to call this endpoint with `{ lesson_id, score, completed: score/total >= 0.7 }`.
- [ ] 5.3 Manual smoke: complete a lesson with 8/10 → `completed=true`; redo with 5/10 → row keeps score 8 and stays completed.

## 6. Definition-of-done

- [ ] 6.1 Lint / typecheck / test pass.
- [ ] 6.2 Manual: complete two lessons of different levels.
- [ ] 6.3 Vercel preview works.
- [x] 6.4 Update `docs/PHASE_5_GRAMMAR.md`.
