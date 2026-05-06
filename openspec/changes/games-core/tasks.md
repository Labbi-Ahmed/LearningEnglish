> Apply groups in order. Groups 3, 4, 5, 6, 7 each isolate one fetch (batch + four result endpoints). Run `npm run lint && npm run typecheck` after every group.

## 1. Shared scaffolding

- [x] 1.1 Create `src/lib/schemas/games.ts` with Zod schemas: `GameTypeSchema` (`'spell'|'sentence'|'synonym'|'quiz'`), `BatchQuerySchema`, `ResultBodySchema`.
- [x] 1.2 Create `src/components/games/game-shell.tsx` (`"use client"`) with timer, score bar, item slot, and finish card. Accept render-prop for per-item rendering and `onSubmit(result)` for the result handler.
- [x] 1.3 Create `src/lib/games/select-batch.ts` with helpers `selectForSpell`, `selectForSentence`, `selectForSynonym`, `selectForQuiz` — all server-side, taking a Supabase user-session client and returning typed batches.
- [x] 1.4 Create `src/lib/games/distractors.ts` exporting `pickDistractors(userId, excludeWordId, n)` which prefers other saved words and falls back to the shared `words` table.
- [x] 1.5 Add a Games nav link to the dashboard top bar.

## 2. Games hub page

- [x] 2.1 Create `src/app/(dashboard)/games/page.tsx` (Server Component) that queries `game_sessions` for the user's last row per `game_type` and renders four cards.
- [ ] 2.2 Manual smoke: with no sessions, hub shows "Not played yet" on all four cards.

## 3. FETCH #1 — `GET /api/games/words` (batch endpoint)

- [x] 3.1 Create `src/app/api/games/words/route.ts`. Validate query with `BatchQuerySchema`. Return `401` if unauthenticated.
- [x] 3.2 Dispatch on `game` to the appropriate `selectForX` helper. Cap `size` at 20. Return `409 not_enough_words` when the helper has fewer than 4 candidates.
- [ ] 3.3 Manual smoke via curl with a real session cookie: `?game=quiz&size=10` returns 10 items each with 3 distractors.

## 4. FETCH #2 — `POST /api/games/spell/result` + spell game UI

- [x] 4.1 Create `src/app/api/games/spell/result/route.ts`. Validate body with `ResultBodySchema`. Verify each `word_id` is owned by caller; insert `game_sessions` (`game_type='spell'`); bump `user_words.mastery_level` for correct items.
- [x] 4.2 Build `src/app/(dashboard)/games/spell/page.tsx` + `spell-game.tsx` client component using `<GameShell>`. On mount, call `GET /api/games/words?game=spell`. Per item: TTS-play the word (use `profiles.preferred_accent`), input field, case-insensitive compare. On round end, POST result.
- [ ] 4.3 Manual smoke: complete a 10-item round; confirm one new `game_sessions` row and updated `user_words.mastery_level` values.

## 5. FETCH #3 — `POST /api/games/sentence/result` + sentence game UI

- [x] 5.1 Create `src/app/api/games/sentence/result/route.ts` (same shape as spell, `game_type='sentence'`).
- [x] 5.2 Build `src/app/(dashboard)/games/sentence/page.tsx` + client engine: shuffle `words.example` tokens; user reorders by tap or drag; compare normalized strings.
- [ ] 5.3 Manual smoke: round end → result row written.

## 6. FETCH #4 — `POST /api/games/synonym/result` + synonym game UI

- [x] 6.1 Create `src/app/api/games/synonym/result/route.ts` (`game_type='synonym'`).
- [x] 6.2 Build `src/app/(dashboard)/games/synonym/page.tsx` + client engine: 4 options, one is the true synonym from `word_relations`, three are distractors.
- [x] 6.3 Wire the antonym variant via `?mode=antonym` if time permits (otherwise leave a TODO).
- [ ] 6.4 Manual smoke: round end → result row written.

## 7. FETCH #5 — `POST /api/games/quiz/result` + quiz game UI

- [x] 7.1 Create `src/app/api/games/quiz/result/route.ts` (`game_type='quiz'`).
- [x] 7.2 Build `src/app/(dashboard)/games/quiz/page.tsx` + client engine: word + 4 meanings, pick the right one.
- [ ] 7.3 Manual smoke: round end → result row written.

## 8. Definition-of-done

- [ ] 8.1 `npm run lint` / `npm run typecheck` / `npm run test` pass.
- [ ] 8.2 Manual: play one round of each game; hub reflects last scores.
- [ ] 8.3 Vercel preview works.
- [x] 8.4 Update `docs/PHASE_3_GAMES.md`.
