## Why

Phase 3 of `Project-plan/fullPlane.md` — `feature/games-core`. Once vocabulary save/list works (Phase 2), users need ways to *practice* their saved words. Four mini-games turn the bank into reps and produce the `game_sessions` rows that Phase 4 (SM-2) and Phase 7 (stats) read. Without games, the saved-word list is a graveyard.

## What Changes

- Add four game routes under `(dashboard)/games/`: `spell`, `sentence`, `synonym`, `quiz`. Each has its own page, client engine, and result-submission endpoint.
- Add `POST /api/games/spell/result`, `/sentence/result`, `/synonym/result`, `/quiz/result` — each accepts `{ score, total, duration_ms, items: [...] }` and writes one `game_sessions` row plus per-item correctness updates on `user_words` (mastery hints; full SM-2 deferred to Phase 4).
- Add `GET /api/games/words` — returns a randomized batch of the caller's saved words suitable for the requested game (size, with/without distractors, with/without synonyms). Each game page calls this once per round.
- Add a games hub at `/games` with four cards (spell / sentence / synonym / quiz), each showing the user's best score and last-played date pulled from `game_sessions`.
- Add Zod schemas in `lib/schemas/games.ts` for every result body and the words-batch query.
- Add a tiny shared `<GameShell>` component (timer, score display, finish screen) so each game UI stays focused on the game logic.

Out of scope: SM-2 review queue (Phase 4), AI-generated questions (Phase 6), grammar-tense practice games (Phase 5), XP/streak rewards (Phase 8 — but `game_sessions.score` is the data Phase 8 will read).

## Capabilities

### New Capabilities

- `games-engine`: shared per-round word fetcher (`GET /api/games/words`), `<GameShell>` UI, scoring/timer state, and result submission contract. Each game's client logic plugs in here.
- `games-spell`: type-the-word-from-audio game.
- `games-sentence`: drag-the-words-into-correct-order game using a saved word in context.
- `games-synonym`: pick the synonym (or antonym) from 4 options.
- `games-quiz`: multiple-choice meaning quiz from saved words.

### Modified Capabilities

- `vocabulary-bank`: extend the dashboard nav to include a `/games` link. No spec-level requirement changes — implementation only. (No delta spec needed.)

## Impact

- **Code (new)**: `src/app/api/games/words/route.ts`; `src/app/api/games/{spell,sentence,synonym,quiz}/result/route.ts`; `src/app/(dashboard)/games/page.tsx` (hub) and one folder per game; `src/components/games/{game-shell.tsx,timer.tsx,score-bar.tsx,finish-card.tsx}`; `src/lib/schemas/games.ts`; `src/lib/games/{select-batch.ts,distractors.ts}`.
- **Code (modified)**: `(dashboard)/layout.tsx` adds a Games nav link.
- **Dependencies**: none new. Uses TanStack Query (already present from Phase 2), Zustand for in-round client state if needed (locked in stack).
- **Database**: no schema changes. Reads `user_words`, writes `game_sessions`. May lightly update `user_words.mastery_level` as a coarse hint; Phase 4 owns SM-2 columns.
- **Free-tier risk**: none. All compute is server-side Postgres with bounded query sizes.
- **Downstream**: Phase 4 reads `game_sessions` and `user_words.mastery_level`; Phase 7 reads `game_sessions` for stats; Phase 8 reads `game_sessions` for XP/streak triggers.
