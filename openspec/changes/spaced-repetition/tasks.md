> Apply groups in order. Groups 2 and 3 each isolate one fetch (due, review). Run lint + typecheck after every group.

## 1. Pure algorithm + cleanup

- [x] 1.1 Create `src/lib/spaced-repetition.ts` with `nextSchedule(state, quality)` per the SM-2 spec.
- [x] 1.2 Add unit tests for: first review, failed review reset, ease-factor floor, interval growth at `repetitions=2` and `>2`.
- [x] 1.3 Decide and document: drop the Phase 3 `mastery_level` bump in result endpoints OR map it to `min(5, repetitions)`. Implement the chosen option.
- [x] 1.4 Create `src/lib/schemas/review.ts` with `ReviewBodySchema` and `DueQuerySchema`.

## 2. FETCH #1 — `GET /api/words/due`

- [x] 2.1 Create `src/app/api/words/due/route.ts`. Validate query, default `limit=20`, max 50. Return `401` if unauthenticated.
- [x] 2.2 Query `user_words` joined to `words` where `next_review_at <= now()`, ordered ascending, limited.
- [x] 2.3 Return `{ items, count: items.length }`.
- [x] 2.4 Manual smoke: with no due rows → empty; backdate `next_review_at` on a few rows → they appear.

## 3. FETCH #2 — `POST /api/words/review`

- [x] 3.1 Create `src/app/api/words/review/route.ts`. Validate body. Load the row via the user-session client; if missing → `404`.
- [x] 3.2 Apply `nextSchedule`, write back the four fields, return the new state.
- [x] 3.3 Manual smoke: review a due row with quality=4 → `interval_days` and `next_review_at` shift forward.

## 4. Review UI

- [x] 4.1 Create `(dashboard)/review/page.tsx` (Server Component fetching the initial due batch) and `review-session.tsx` (`"use client"`).
- [x] 4.2 Walk the queue card-by-card; show word, hide meaning until "Show answer"; capture rating (Again/Hard/Good/Easy → 1/3/4/5) via buttons and 1/2/3/4 keyboard shortcuts.
- [x] 4.3 POST each review through TanStack Query `useMutation`. On success, advance to the next card.
- [x] 4.4 Empty-queue state: render "All caught up — see you tomorrow."
- [x] 4.5 Add a Review nav link with the due count badge (server-rendered in the dashboard layout, refreshed via revalidation after each session).

## 5. Definition-of-done

- [x] 5.1 Lint / typecheck / test pass.
- [x] 5.2 Manual: save 3 words, backdate `next_review_at`, review them; intervals advance.
- [x] 5.3 Vercel preview works.
- [x] 5.4 Update `docs/PHASE_4_SPACED_REPETITION.md`. Tag `v0.1.0` per `Project-plan/fullPlane.md` after merge.
