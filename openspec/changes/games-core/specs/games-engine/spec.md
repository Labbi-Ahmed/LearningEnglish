## ADDED Requirements

### Requirement: Per-round word batch endpoint

The system SHALL expose `GET /api/games/words?game=<spell|sentence|synonym|quiz>&size=<n>` returning a randomized batch of the authenticated user's saved words appropriate for the requested game. The batch MUST include at most `size` items (default 10, max 20). Items MUST include `word_id`, `word`, `meaning`, `example`, `ipa_uk`, `ipa_us`. For `synonym` and `quiz`, items MUST also include 3 distractor strings drawn from other saved words or the shared `words` table.

#### Scenario: Sufficient saved words
- **WHEN** an authenticated user with ≥10 saved words requests `GET /api/games/words?game=quiz&size=10`
- **THEN** the response is 10 randomized items, each with 3 distractors

#### Scenario: Not enough saved words
- **WHEN** the user has fewer than 4 saved words and requests any game batch
- **THEN** the endpoint returns `409 { error: "not_enough_words", min: 4 }`

#### Scenario: Unauthenticated caller
- **WHEN** no session is present
- **THEN** the endpoint returns `401`

### Requirement: Game session result endpoints

The system SHALL expose `POST /api/games/{spell|sentence|synonym|quiz}/result` accepting `{ score: int, total: int, duration_ms: int, items: [{ word_id, correct: boolean }] }`. Each endpoint MUST write exactly one row into `game_sessions` with `game_type` matching the path, and MUST coarse-update each referenced `user_words.mastery_level` (incrementing on correct, capped) under RLS.

#### Scenario: Valid submission
- **WHEN** an authenticated user POSTs a valid result body
- **THEN** the response is `201 { session_id }` and one `game_sessions` row exists with the caller's `user_id`

#### Scenario: Item references a word the user does not own
- **WHEN** the body contains a `word_id` that is not in the caller's `user_words`
- **THEN** the endpoint returns `400 { error: "unknown_word_id" }` and no rows are written

#### Scenario: Score / total mismatch
- **WHEN** `score > total` or `total !== items.length`
- **THEN** the endpoint returns `400 { error: "invalid_result" }`

### Requirement: Game shell UI

The system SHALL provide a shared `<GameShell>` component encapsulating: round timer, score display, "next item" advancement, end-of-round finish card with replay and "Back to games" buttons, and submission of the final result via the matching endpoint. Each game's page SHALL plug per-item rendering into the shell rather than reimplementing it.

#### Scenario: Round end
- **WHEN** the last item is answered
- **THEN** the shell calls the appropriate result endpoint exactly once and renders the finish card with score and duration

#### Scenario: User abandons mid-round
- **WHEN** the user navigates away before the last item
- **THEN** no result is submitted (partial sessions are not persisted)

### Requirement: Games hub

The system SHALL expose `/games` listing the four games as cards. Each card MUST show the user's most recent `game_sessions.score` for that `game_type` and the date played, or a "Not played yet" placeholder.

#### Scenario: First-time visit
- **WHEN** a user with zero `game_sessions` rows opens `/games`
- **THEN** all four cards show "Not played yet"
