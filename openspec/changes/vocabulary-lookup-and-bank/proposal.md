## Why

Phase 1 (`setup-foundation`) shipped a working Next.js + Supabase + auth shell, but the dashboard is still a placeholder. Phase 2 of the roadmap (`feature/vocabulary` in `Project-plan/fullPlane.md`) is the first real user-facing feature: a smart vocabulary notebook backed by the Free Dictionary API and a personal word bank. Every later phase (games, spaced repetition, speaking, AI feedback) reads from the same `words` / `user_words` tables, so building lookup + save + list now unblocks the rest of the MVP. This change is sized so the user can apply each fetch / endpoint independently, one at a time.

## What Changes

- Add a `lib/dictionary.ts` wrapper around the Free Dictionary API (`https://api.dictionaryapi.dev/api/v2/entries/en/<word>`) with normalization and Zod-validated response parsing.
- Implement `GET /api/words/[word]` — cache-first lookup that returns a row from the shared `words` table when present; otherwise fetches from the Free Dictionary API, persists the result (plus synonym/antonym rows in `word_relations`), and returns the normalized payload.
- Implement `POST /api/words/save` — upserts a `user_words` row tying the authenticated user to a `words.id` (creating the word via the lookup endpoint logic if it isn't cached yet).
- Implement `GET /api/words` — paginated list of the authenticated user's saved words, with search and ordering by `created_at desc`.
- Implement `DELETE /api/words/[id]` — removes one of the user's `user_words` rows (idempotent; RLS-scoped).
- Build the `(dashboard)/vocabulary` UI:
  - search box that calls the lookup endpoint, shows meaning, IPA, part of speech, example sentence, synonyms, and antonyms;
  - "Play UK" / "Play US" buttons using browser SpeechSynthesis (no audio assets);
  - "Save to my words" button that calls the save endpoint with optimistic update via TanStack Query;
  - a list view of the user's saved words with a search input and a remove action.
- Add TanStack Query provider at the dashboard layout level (first phase that needs it) and a tiny Zustand store only if a non-server piece of UI state demands it (none expected — keep server state in TanStack Query).
- Add `lib/speech.ts` with thin `speak(text, accent)` and `cancelSpeech()` helpers wrapping `window.speechSynthesis`, voice-selection logic for `en-GB` / `en-US`, and a no-op fallback when the API is unavailable.
- Add Zod schemas in `lib/schemas/words.ts` shared between the API routes and the client.

Out of scope (deferred): spaced-repetition review queue and the SM-2 update endpoints (Phase 4), games (Phase 3), grammar lessons (Phase 5), speaking recordings (Phase 6), AI features (Phase 6/7).

## Capabilities

### New Capabilities

- `vocabulary-lookup`: cache-first dictionary lookup. Free Dictionary API wrapper, normalization to the `words` / `word_relations` schema, deduped writes (one row per lowercase word forever), friendly errors on rate-limit or word-not-found, accent-aware audio playback through browser TTS.
- `vocabulary-bank`: per-user saved-word list. Save (create-or-noop), list with search + pagination, delete, all RLS-scoped to `auth.uid()`. Becomes the data source for Phase 3 games and Phase 4 spaced repetition.

### Modified Capabilities

None — `setup-foundation` provided the shell; this change only adds new capabilities on top of it.

## Impact

- **Code (new)**: `src/app/api/words/[word]/route.ts`, `src/app/api/words/save/route.ts`, `src/app/api/words/route.ts` (GET list), `src/app/api/words/[id]/route.ts` (DELETE), `src/app/(dashboard)/vocabulary/page.tsx` and supporting components in `src/components/vocabulary/`, `src/lib/dictionary.ts`, `src/lib/speech.ts`, `src/lib/schemas/words.ts`, and a `QueryProvider` in `src/components/providers/query-provider.tsx` mounted from `src/app/(dashboard)/layout.tsx`.
- **Code (modified)**: `src/app/(dashboard)/layout.tsx` to include the TanStack Query provider and a vocabulary nav link; `src/app/(dashboard)/dashboard/page.tsx` may add a "Recently saved words" preview block (optional, behind a TODO if cut).
- **Dependencies**: add `@tanstack/react-query` (in the locked stack, not yet installed). No paid services. No new dictionary providers — Free Dictionary API only.
- **Database**: no schema changes. Reads/writes against existing `words`, `word_relations`, `user_words` tables created by `001_initial_schema.sql`. Service role is used server-side for the public `words` and `word_relations` writes; the user's session client is used for `user_words` so RLS enforces ownership.
- **Free-tier risk**: cache-first lookup keeps Free Dictionary API calls bounded by the count of *unseen* words, not user actions; once a word is in `words`, it's served from Postgres forever. Browser TTS keeps audio at $0.
- **Downstream**: unblocks Phase 3 (games consume `user_words`), Phase 4 (spaced-repetition reads `user_words` due rows), and gives the rest of the app a real `words` cache to grow against.
