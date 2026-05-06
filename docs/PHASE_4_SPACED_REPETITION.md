# Phase 4 — Spaced repetition

## Status: Implementation complete (manual smoke + Vercel preview pending)

## What was built

### Core algorithm
`src/lib/spaced-repetition.ts` — pure SM-2: `nextSchedule({ ease_factor, interval_days, repetitions }, quality)` returns the new triple plus `next_review_at` ISO. Ease floor of 1.3, quality clamped to 0–5. Six unit tests in `spaced-repetition.test.ts`.

### Routes added

| Route | Type | Purpose |
|---|---|---|
| `GET /api/words/due?limit=N` | API | Due `user_words` joined to `words`, ordered by `next_review_at asc`. Default 20, max 50. |
| `POST /api/words/review` | API | Apply SM-2 to a row the caller owns. RLS-scoped read → 404 if not owned. |
| `/review` | Page | Daily review session — server-rendered initial batch, client-side card walk |

### UI
- One card at a time, meaning hidden until "Show answer".
- Four ratings: Again (1) / Hard (3) / Good (4) / Easy (5).
- Keyboard shortcuts: Space/Enter reveals; 1–4 rates after reveal.
- Empty queue + finish state: "All caught up — see you tomorrow."
- TTS replay buttons (UK / US) on every card.

### Layout
Review nav link with due-count badge (server-rendered in `(dashboard)/layout.tsx`, refreshed via `router.refresh()` after each session).

### Decisions

- **Quality scale {1,3,4,5}** in the UI but the endpoint accepts the full 0..5.
- **Dropped the Phase 3 `mastery_level` bump** in `lib/games/submit-result.ts`. SM-2 (`repetitions`/`ease_factor`) is now the mastery signal; `mastery_level` lingers as a derived display value.
- **Server-side cap at 50** for the due query to prevent a runaway queue.
- **No schema migration** — `user_words` already has all SM-2 columns from `0004_user_words.sql`.

## Manual verification

1. Save 3 words from `/vocabulary`.
2. In Supabase SQL editor, backdate them: `update user_words set next_review_at = now() - interval '1 day' where user_id = auth.uid();`
3. Open `/review` → walks through 3 cards.
4. After Good on card 1: `repetitions = 1`, `interval_days = 1`, `next_review_at = now + 1 day`.
5. Dashboard "due today" badge drops to 0 after the session.

## What this unblocks

The `/dashboard` "due today" pill and the "Recommended next: review N words" rule from `roadmap-progress` now resolve to real data.
