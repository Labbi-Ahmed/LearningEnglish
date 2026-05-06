# Phase 3 — Games Core

## Status: Implementation complete (lint/typecheck pending)

## What was built

Four mini-games that let users practice their saved vocabulary words.

### Routes added

| Route | Type | Purpose |
|---|---|---|
| `GET /api/games/words` | API | Returns randomized batch for the requested game |
| `POST /api/games/spell/result` | API | Records spell game session |
| `POST /api/games/sentence/result` | API | Records sentence game session |
| `POST /api/games/synonym/result` | API | Records synonym game session |
| `POST /api/games/quiz/result` | API | Records quiz game session |
| `/games` | Page | Hub showing all 4 games + last scores |
| `/games/spell` | Page | Type-the-word-from-audio game |
| `/games/sentence` | Page | Reorder shuffled tokens game |
| `/games/synonym` | Page | Pick-the-synonym from 4 options |
| `/games/quiz` | Page | Pick-the-correct-meaning from 4 options |

### Library files added

| File | Purpose |
|---|---|
| `src/lib/schemas/games.ts` | Zod schemas: GameType, BatchQuery, ResultBody |
| `src/lib/games/types.ts` | Shared TS types: BatchItem, GameSubmitPayload |
| `src/lib/games/distractors.ts` | Picks distractor strings; falls back to shared `words` table |
| `src/lib/games/select-batch.ts` | Server-side batch selectors (spell/sentence/quiz/synonym) |
| `src/lib/games/submit-result.ts` | Shared POST handler for all 4 result endpoints |

### Components added

| File | Purpose |
|---|---|
| `src/components/games/game-shell.tsx` | Shared timer + score bar + finish card |
| `src/app/(dashboard)/games/spell/spell-game.tsx` | Spell game client component |
| `src/app/(dashboard)/games/sentence/sentence-game.tsx` | Sentence game client component |
| `src/app/(dashboard)/games/synonym/synonym-game.tsx` | Synonym game client component |
| `src/app/(dashboard)/games/quiz/quiz-game.tsx` | Quiz game client component |

### Files modified

- `src/app/(dashboard)/layout.tsx` — added "Games" nav link

## Acceptance criteria

- [x] Hub at `/games` shows 4 cards with last score / "Not played yet"
- [x] `GET /api/games/words` returns 401 (unauthed), 409 < 4 words, 200 otherwise
- [x] All 4 result endpoints write `game_sessions` and update `mastery_level`
- [x] Spell game plays TTS, accepts typed answer (case-insensitive)
- [x] Sentence game shuffles tokens, tap-to-reorder, normalized comparison
- [x] Synonym game shows 4 options (correct + 3 distractors)
- [x] Quiz game shows 4 meanings (correct + 3 distractors)
- [ ] `npm run lint` passes — pending manual run
- [ ] `npm run typecheck` passes — pending manual run
- [ ] Manual smoke test
- [ ] Vercel preview

## Design decisions

- One shared `GET /api/games/words` endpoint dispatches to per-game selectors.
- One shared `submit-result.ts` helper keeps all 4 POST handlers thin (1 line each).
- Mastery level incremented +1 (capped at 5) on correct answer — coarse hint until Phase 4 SM-2.
- Distractors prefer user's own saved words; fall back to shared `words` table.
- Synonym `?mode=antonym` is wired in the batch endpoint and selector — the page has a TODO comment to expose it in UI when needed.
- No new npm dependencies added.
