## Context

SM-2 columns already exist on `user_words` (Phase 1 schema). This change adds the algorithm, two endpoints, and the review UI.

## Goals

- Pure SM-2 in one file — easy to unit-test, no DB or Supabase dependency.
- Two endpoints, each its own task group, applied independently.
- Review UI that's keyboard-first (1/2/3/4 keys map to ratings) for power users.

## Non-Goals

- Custom ease/interval tuning, leech detection, study deck partitioning, or AI prioritization.
- Migrating existing `mastery_level` values into SM-2 state — those rows simply start at the defaults already in the schema and converge naturally.

## Decisions

### Decision: Quality scale of {1, 3, 4, 5}, not full 0..5

Anki uses Again/Hard/Good/Easy, mapping to 1/3/4/5. Skipping 0 and 2 simplifies the UI without meaningfully degrading the algorithm. The endpoint still accepts 0..5 for flexibility (future "totally blank" or partial-recall buttons).

### Decision: Newly saved words start `next_review_at = now()`

Already true in the schema (`default now()`). This means a freshly saved word is due immediately — desired so users can review fresh material on the same day they save it.

### Decision: Drop the Phase 3 `mastery_level` bump in favor of `repetitions`

Once Phase 4 ships, `repetitions` is the better signal. Either remove the bump in `result` endpoints or treat `mastery_level` as `min(5, repetitions)` and update both. Recommend dropping the bump and letting `mastery_level` decay into a derived display value computed in API response shaping. (Tasks group 1 contains the cleanup step.)

### Decision: Cap due-queue at 50 rows server-side

Avoid a user with 5,000 overdue words crashing the UI on first load. UI default is 20; "Load more" not provided in MVP — they review 20, come back tomorrow.

## Risks / Trade-offs

- **Timezone**: `next_review_at` is `timestamptz`; due-comparison uses server `now()`. A user reviewing late in their local night may see "due tomorrow" when they expected "due today". Acceptable for MVP — revisit if users complain.
- **Race conditions**: two devices reviewing the same row will both write; last-write-wins. Acceptable.

## Migration Plan

No schema migration. No data backfill required.
