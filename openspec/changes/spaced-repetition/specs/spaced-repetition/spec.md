## ADDED Requirements

### Requirement: SM-2 algorithm

The system SHALL implement the SM-2 spaced-repetition algorithm in `lib/spaced-repetition.ts` as a pure function `nextSchedule(state, quality)` where `state = { ease_factor, interval_days, repetitions }` and `quality ∈ {0,1,2,3,4,5}`. Behavior:

- If `quality < 3`: reset `repetitions = 0`, `interval_days = 1`.
- Else: increment `repetitions`. If `repetitions == 1`: `interval_days = 1`. If `repetitions == 2`: `interval_days = 6`. Else: `interval_days = round(prev_interval_days * ease_factor)`.
- Update `ease_factor = max(1.3, ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))`.
- Compute `next_review_at = now + interval_days days`.

#### Scenario: First successful review
- **WHEN** a fresh row (`repetitions=0, interval_days=1, ease_factor=2.5`) gets `quality=4`
- **THEN** new state is `repetitions=1, interval_days=1, ease_factor≈2.5`, `next_review_at` is one day out

#### Scenario: Failed review resets streak
- **WHEN** a row with `repetitions=5, interval_days=30, ease_factor=2.6` gets `quality=1`
- **THEN** new state is `repetitions=0, interval_days=1`, `ease_factor` decreases but stays ≥ 1.3, `next_review_at` is one day out

#### Scenario: Ease floor
- **WHEN** repeated low-quality reviews drive `ease_factor` toward 1.3
- **THEN** `ease_factor` never drops below 1.3

### Requirement: Due-queue endpoint

The system SHALL expose `GET /api/words/due?limit=<n>` returning the authenticated user's `user_words` rows where `next_review_at <= now()`, joined to `words`, ordered by `next_review_at asc`. `limit` defaults to 20, max 50.

#### Scenario: Mixed due / future
- **WHEN** the user has 5 due rows and 10 future rows
- **THEN** the response contains exactly the 5 due items

#### Scenario: Empty due queue
- **WHEN** no rows are due
- **THEN** the response is `{ items: [], count: 0 }`

#### Scenario: Unauthenticated
- **WHEN** no session is present
- **THEN** the endpoint returns `401`

### Requirement: Review-submission endpoint

The system SHALL expose `POST /api/words/review` accepting `{ user_word_id: uuid, quality: 0..5 }`. The endpoint MUST load the row (RLS-scoped), apply `nextSchedule`, persist all four fields, and return the new state and `next_review_at`.

#### Scenario: Valid submission
- **WHEN** an authenticated user POSTs `{ user_word_id, quality: 4 }` for a row they own
- **THEN** the row's SM-2 fields are updated and the response is `200 { ease_factor, interval_days, repetitions, next_review_at }`

#### Scenario: Row not owned
- **WHEN** the user POSTs a `user_word_id` that does not belong to them
- **THEN** RLS prevents the update and the endpoint returns `404`

#### Scenario: Invalid quality
- **WHEN** `quality` is outside `0..5` or non-integer
- **THEN** the endpoint returns `400 { error: "invalid_quality" }`

### Requirement: Review UI

The system SHALL expose `(dashboard)/review` showing one due card at a time. Each card MUST hide the meaning, ask the user to recall, reveal on click, then capture one of four ratings: Again (1) / Hard (3) / Good (4) / Easy (5). Each rating POSTs `/api/words/review` and advances. When the queue is empty, show a "All caught up — see you tomorrow" finish state.

#### Scenario: Walks the queue
- **WHEN** the user opens `/review` with 5 due cards
- **THEN** the page presents them one at a time and POSTs a review for each rating
- **AND** after the 5th card, the finish state is shown

#### Scenario: No words due
- **WHEN** the user opens `/review` with zero due rows
- **THEN** the page shows the finish state immediately

### Requirement: Due-count badge

The dashboard nav SHALL show a "Review" link with a numeric badge equal to the count returned by `/api/words/due` (capped at 99). The count MUST refresh after each review submission.

#### Scenario: Badge updates after review
- **WHEN** the user finishes a review session and lands back on the dashboard
- **THEN** the Review badge shows the new (lower) due count
