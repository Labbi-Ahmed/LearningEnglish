## Why

Phase 4 of `Project-plan/fullPlane.md` — `feature/spaced-repetition`. Phase 2 stores words; Phase 3 lets users practice them; Phase 4 schedules *which* words to review and *when* using the SM-2 algorithm. Without this, users have no daily-return loop and the saved-word list grows without effective retention. The SM-2 columns (`ease_factor`, `interval_days`, `repetitions`, `next_review_at`) already exist in `001_initial_schema.sql`.

## What Changes

- Implement `lib/spaced-repetition.ts` — pure SM-2 algorithm: `nextSchedule({ ease_factor, interval_days, repetitions }, quality: 0..5)` returning the new triple plus `next_review_at`.
- Implement `GET /api/words/due` — returns the authenticated user's `user_words` rows where `next_review_at <= now()`, joined to `words`, capped at a daily limit (default 20). Ordered by oldest `next_review_at`.
- Implement `POST /api/words/review` — accepts `{ user_word_id, quality: 0..5 }`, applies SM-2 to the row, writes back `ease_factor`, `interval_days`, `repetitions`, `next_review_at`. Returns the new schedule.
- Build `(dashboard)/review` UI — daily review session that walks the due queue card by card, asks the user to recall, reveals the answer, captures a quality rating (Again / Hard / Good / Easy → 1/3/4/5), and POSTs the review.
- Add a "Due today" badge to the dashboard home and games hub showing the count from `/api/words/due`.
- Replace the coarse `mastery_level` bump from Phase 3 with an SM-2-aware update, OR keep `mastery_level` as a derived view of `repetitions` — pick one and document.

Out of scope: leech detection, custom intervals, deck-level settings, AI-suggested review priorities.

## Capabilities

### New Capabilities

- `spaced-repetition`: the SM-2 algorithm, due-queue endpoint, review-submission endpoint, and review UI.

### Modified Capabilities

- `vocabulary-bank`: `user_words` rows now have meaningful SM-2 fields after each review. (No spec-level requirement change in `vocabulary-bank` — add as a delta only if reviewers feel the contract changes.)
- `games-engine`: optionally consult `next_review_at` to bias batch selection toward overdue words. (Implementation tweak; no spec change.)

## Impact

- **Code (new)**: `src/lib/spaced-repetition.ts`; `src/app/api/words/due/route.ts`; `src/app/api/words/review/route.ts`; `src/app/(dashboard)/review/page.tsx` + `review-session.tsx`; `src/lib/schemas/review.ts`.
- **Code (modified)**: dashboard layout adds Review nav link with due-count badge.
- **Dependencies**: none new.
- **Database**: no schema change. SM-2 columns already exist.
- **Free-tier risk**: none.
- **Downstream**: Phase 7 stats use review history; Phase 8 streak uses "completed today's review" as one trigger.
