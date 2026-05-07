## Context

`vocabulary-lookup-and-bank` (Phase 2) stores the `meaning`, `example`, `synonyms`, and `antonyms` for each word looked up. All fields are English only. The `words` table has a row per unique English word shared across all users. Adding Bangla translation fields to that shared cache means the MyMemory API is called exactly once per word globally — second user to look up "apple" gets Bangla from DB, not from MyMemory.

Migration `0018_words_bangla.sql` is already written and adds `meaning_bn`, `example_bn`, `word_bn` to `words` plus a pg_trgm GIN index on `word_bn` for future reverse search. Migration `0019` will add `related_text_bn` to `word_relations` for synonyms/antonyms.

## Goals

- Translate meaning, example, word itself, synonyms, and antonyms at first lookup and never again.
- Show an EN / বাং toggle on the WordCard that switches all four text sections simultaneously.
- Make translation failure invisible to the user — English data is always shown regardless.
- Lay the DB groundwork for future Bangla→English reverse search without implementing the UI yet.

## Non-Goals

- Bangla→English search UI (infrastructure only in this change).
- Translating IPA, part-of-speech labels, or game question text.
- Backfilling Bangla data for words already in the cache (they show no toggle; users re-lookup if they want bn).
- Any paid or rate-limited translation API.

## Decisions

### Decision: MyMemory API, no key

MyMemory (`https://api.mymemory.translated.net/get?q=<text>&langpair=en|bn`) is free, requires no API key, and supports Bengali. 1000 req/day is sufficient given that translations are cached permanently. If the limit is hit, `translateTobn()` returns null and the toggle is hidden — no user-visible crash.

**Tradeoff**: MyMemory translation quality is lower than DeepL or Google. Acceptable for an MVP learning app where approximate meaning is helpful. Can swap the implementation behind `translateTobn()` later without touching callers.

### Decision: Translate at cache-miss time, not lazily

Translation happens in the same `upsertWordFromDictionary()` call as the English lookup, using `Promise.all()` so all MyMemory calls run in parallel. This means first lookup of a new word takes slightly longer (~200–400 ms extra), but every subsequent lookup — by any user — is instant from DB.

**Tradeoff**: Slightly slower first hit vs. guaranteed cache warmth. Preferred because lazy translation would require a background job or a second round-trip.

### Decision: Synonyms/antonyms translated per relation row

Each `word_relations` row gets its own `related_text_bn`. This lets future features (e.g., a Bangla synonym game) query directly without joining back through a translation step.

**Tradeoff**: N MyMemory calls per word (where N = synonym + antonym count, typically 4–12). All run in parallel via `Promise.all()`. Individual failures are ignored.

### Decision: Toggle hidden when meaning_bn is null

Words cached before this migration have `meaning_bn = null`. The toggle is simply not rendered — no "translation unavailable" message, no retry button. Users who want Bangla can re-search the word to trigger a fresh lookup and translation.

**Tradeoff**: Silent degradation. Preferred over a confusing half-loaded state.

### Decision: word_bn uses translation of the English word, not a dictionary lookup

`word_bn` is populated by calling `translateTobn(word)` — translating the English word string to Bangla (e.g. "apple" → "আপেল"). This is a transliteration/translation, not a native Bangla dictionary entry. Sufficient for reverse search indexing.

## Risks / Trade-offs

- **MyMemory rate limit**: if many new words are looked up on the same day, the 1000 req/day cap could be hit. Mitigated by: (a) each word is only translated once ever; (b) if the cap is hit, English still works normally.
- **Translation accuracy**: MyMemory may produce awkward Bangla for technical or rare English words. Acceptable for MVP; can be improved by swapping the API behind `translateTobn()`.
- **Parallel fetch count**: a word with 10 synonyms + 5 antonyms triggers 18 parallel MyMemory calls (meaning + example + word + 15 relations). Each is ~100–300 ms and they run concurrently. No throttling needed at MVP volume.

## Migration Plan

- `0018_words_bangla.sql` — already written. Apply in Supabase SQL editor before deploying.
- `0019_word_relations_bn.sql` — new. Apply in Supabase SQL editor before deploying.
- No data backfill. Existing cached words keep `meaning_bn = null`; toggle is hidden for them.
