## Why

Users of this app are primarily Bangla speakers learning English. When they look up a word, they see only the English meaning — if they don't already know the English definition, they have to look it up separately in another tool. Adding an inline Bangla translation removes that friction and makes the word card self-contained. Both languages load in a single lookup request and are cached forever in the shared `words` table, so the translation cost is paid exactly once per word across all users.

## What Changes

- Add a `translateTobn()` server-side helper (`src/lib/translate.ts`) that calls the free MyMemory API (`en→bn`) and returns a string or null on any error.
- Extend `upsertWordFromDictionary()` in `src/lib/dictionary.ts` to: (a) translate the meaning, example, and the word itself in parallel at first lookup, saving `meaning_bn`, `example_bn`, `word_bn` to the `words` row; (b) translate every synonym and antonym and save `related_text_bn` on each `word_relations` row; (c) return all bn fields in `CachedWord`.
- Extend the `GET /api/words/[word]` route to include `meaning_bn`, `example_bn`, `synonyms_bn`, `antonyms_bn` in the response JSON.
- Add an **EN / বাং** toggle to `WordCard` in `vocabulary-search.tsx` that switches the displayed meaning, example sentence, synonyms, and antonyms between the two languages. Toggle is hidden when `meaning_bn` is null (words cached before this change, or if MyMemory failed).
- Add two DB migrations: `0018` (already written — `meaning_bn`, `example_bn`, `word_bn` on `words` + pg_trgm index on `word_bn` for future Bangla→English reverse search) and `0019` (`related_text_bn` on `word_relations`).

Out of scope: Bangla→English reverse search UI (the `word_bn` column and index are added now as infrastructure but the search UI is a separate future change), translating game question text (games always use English meaning), any paid translation API.

## Capabilities

### New Capabilities

- `bangla-translation-cache`: server-side translation helper + DB caching layer. Translates meaning, example, word itself, and all synonyms/antonyms at first lookup via MyMemory API; caches results permanently in `words` and `word_relations` tables. Translation is non-fatal — English data is always saved regardless of translation outcome.
- `bangla-toggle-ui`: EN / বাং toggle on the vocabulary WordCard. Switches meaning, example, synonyms, and antonyms simultaneously. Hidden when no Bangla data is available. English is always the default.

### Modified Capabilities

- `vocabulary-lookup-and-bank`: `GET /api/words/[word]` returns four new fields (`meaning_bn`, `example_bn`, `synonyms_bn`, `antonyms_bn`). `LookupResponse` type updated. `savedToLookup()` helper updated with null bn fields. No behaviour change for callers that ignore the new fields (games, review).

## Impact

- **Code (new)**: `src/lib/translate.ts`.
- **Code (modified)**: `src/lib/dictionary.ts`, `src/app/api/words/[word]/route.ts`, `src/app/(dashboard)/vocabulary/vocabulary-search.tsx`.
- **Database (new migrations)**: `0018_words_bangla.sql` (already written), `0019_word_relations_bn.sql`.
- **Dependencies**: none new. MyMemory API is called via the native `fetch` already in the project.
- **Free-tier risk**: MyMemory allows 1000 requests/day. Each new word costs 3 + (synonyms + antonyms count) calls. Words already cached cost 0. Risk is minimal given expected usage volume.
- **Downstream**: games, review, and SM-2 routes are unaffected — they read `meaning` (English) and ignore bn columns.
