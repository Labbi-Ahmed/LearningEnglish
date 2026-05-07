# Phase 2 — Vocabulary Lookup & Bank

## Overview

Users can search any English word, view a full dictionary card (IPA, meaning, example, synonyms/antonyms), save it to their personal word bank, and manage it from the saved-words list.

## Features

### Word Lookup — `GET /api/words/[word]`

- Calls the Free Dictionary API; caches result in the `words` table forever.
- Returns: `word`, `pos`, `ipa_uk`, `ipa_us`, `meaning`, `example`, `synonyms[]`, `antonyms[]`, `word_id`, `saved` (boolean — whether the authenticated user already has this word).
- `saved: true` pre-disables the "Save" button with an "Already saved" label on the card.

### Save Word — `POST /api/words/save`

- Inserts into `user_words(user_id, word_id)` with `UNIQUE` constraint → idempotent.
- Returns `{ saved, already, word_id }`.
- Optimistic update on the client invalidates the saved-words list on settle.

### Saved Words List — `GET /api/words`

- Paginated (`offset`, `limit`), filterable by `q` (partial match on word).
- Returns `{ items[], nextOffset }`.
- Used as typeahead suggestions in the search box.

### Delete Word — `DELETE /api/words/[uuid]`

- Removes the `user_words` row. UUID param distinguishes from slug lookups.

## UI

- **`VocabularySearch`** — search box with typeahead from saved words, dictionary card result.
- **`SavedWordsList`** — virtualized list with delete, IPA, mastery badge.
- **`VocabularyClient`** — combines search + list, routes `activeWord` state between them.

### Dictionary Card

- Play UK/US pronunciation (browser SpeechSynthesis).
- Save button → shows "✓ Saved" or "Already in your bank" after save or if `saved === true` from API.

## Key Decisions

- **Free Dictionary API is never called twice for the same word.** All lookups hit the `words` cache first; only misses trigger the external call.
- **`saved` field added to lookup response** so the card reflects saved state without a separate round-trip.
- **Typeahead sources from saved words only** — no external suggestions, which keeps it fast and zero-cost.

## Acceptance Criteria

- [x] Search returns a dictionary card with IPA, meaning, example, synonyms/antonyms
- [x] Saving a word adds it to the bank and updates the list optimistically
- [x] Repeat saves are idempotent — "Already saved" shown
- [x] Lookup API returns `saved: boolean` — card disables save button accordingly
- [x] Saved words list is paginated and searchable
- [x] Words can be deleted from the bank
- [x] `npm run typecheck` and `npm run lint` pass
