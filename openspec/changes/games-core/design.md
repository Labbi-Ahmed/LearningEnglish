## Context

Phase 2 (`vocabulary-lookup-and-bank`) gave users a saved-word list. Phase 3 turns those rows into reps. Schema is ready (`game_sessions` exists from `001_initial_schema.sql`); only application code is needed. The user wants tasks orderable so each fetch can be applied independently.

## Goals

- Four working games in one PR-friendly stack of independently apply-able task groups.
- Reuse one batch-fetch endpoint for all games (parameterized by `game`) to avoid four near-duplicate routes.
- Each game's *result* endpoint is its own task group (one fetch each).

## Non-Goals

- AI-generated questions or distractors — Phase 6.
- Spaced-repetition-aware item selection — Phase 4.
- XP, streak, leaderboard side effects — Phase 8.

## Decisions

### Decision: One batch endpoint, four result endpoints

`GET /api/games/words?game=<type>` is shared because the *selection* logic differs only in filters (needs-example, needs-synonyms, etc.) and 80% of the SQL is the same. The four `POST .../result` endpoints stay separate because (a) Phase 8 will hang game-specific XP rules off them, and (b) the user wants one fetch per task group.

**Tradeoff**: a future fifth game still needs a small route file. Acceptable.

### Decision: Coarse mastery hint now, full SM-2 later

Each correct answer in this phase increments `user_words.mastery_level` by 1 (capped at 5). This lets the games hub show progress meaningfully *before* Phase 4 ships SM-2. Phase 4 will own `ease_factor`, `interval_days`, `repetitions`, `next_review_at` and may rewrite this hint. Document the override risk in `tasks.md` so we don't ship conflicting logic.

### Decision: Distractor source — saved words first, cache fallback

For synonym/quiz, prefer distractors from the user's own bank (more pedagogically valuable). Fall back to random rows from the shared `words` table when fewer than three options exist. Avoids a "user with 4 saved words can't play" cliff.

### Decision: Game shell as a thin component, not a framework

`<GameShell>` owns timer + score + finish card. Each game owns its per-item rendering and answer evaluation. We do not introduce a generic "question type" abstraction — three lines of duplication per game is cheaper than the abstraction.

## Risks / Trade-offs

- **TTS voice availability on mobile Safari**: voices load asynchronously; the spell game must wait for `voiceschanged` before starting the round or queue with a fallback voice. Handled in `lib/speech.ts` (already present from Phase 2).
- **Race on session insert**: if the user closes the tab during the final submission, the row may be lost. Acceptable — partial sessions are explicitly out of scope per spec.
- **Distractor quality**: random words can be weak distractors. Acceptable for MVP; iterate post-launch.

## Migration Plan

No schema migration. Phase 4 may add SM-2 backfill logic; that's its own change.
