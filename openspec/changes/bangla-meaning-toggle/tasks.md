> Apply groups in order. Groups 2–4 each map to one logical unit of work. Run `npm run lint && npm run typecheck` after every group.

## 1. Database migrations

- [ ] 1.1 Apply `supabase/migrations/0018_words_bangla.sql` in Supabase SQL editor (already written — adds `meaning_bn`, `example_bn`, `word_bn` to `words` + pg_trgm index).
- [x] 1.2 Create and apply `supabase/migrations/0019_word_relations_bn.sql`: `alter table word_relations add column if not exists related_text_bn text;`
- [ ] 1.3 Manual verify: `select column_name from information_schema.columns where table_name in ('words','word_relations') and column_name like '%_bn%';` returns 4 rows.

## 2. FETCH #1 — Translation helper + dictionary cache layer

- [x] 2.1 Create `src/lib/translate.ts`. Export `translateTobn(text: string): Promise<string | null>`. Call `https://api.mymemory.translated.net/get?q=<encoded>&langpair=en|bn`. Parse `responseData.translatedText`. Return null on any error (network, non-200, bad JSON, empty string).
- [x] 2.2 Update `CachedWord` interface in `src/lib/dictionary.ts`: add `meaning_bn: string | null`, `example_bn: string | null`, `word_bn: string | null`, `synonyms_bn: string[]`, `antonyms_bn: string[]`.
- [x] 2.3 Update cache-hit path in `upsertWordFromDictionary()`: extend `.select()` on `words` to include `meaning_bn, example_bn, word_bn`; extend `word_relations` select to include `related_text_bn`; build `synonyms_bn` and `antonyms_bn` arrays from the relation rows.
- [x] 2.4 Update cache-miss path in `upsertWordFromDictionary()`: after inserting the English row, call `Promise.all([translateTobn(meaning), translateTobn(example), translateTobn(word), ...synonyms.map(translateTobn), ...antonyms.map(translateTobn)])`. Update the `words` row with `meaning_bn`, `example_bn`, `word_bn`. Upsert `word_relations` rows with `related_text_bn` populated. Wrap the entire block in try/catch — English data must be returned regardless.
- [ ] 2.5 Manual smoke: search a brand-new word; check `select meaning_bn, word_bn from words where word = '<searched>';` in Supabase — both fields populated.

## 3. FETCH #2 — API route update

- [x] 3.1 Update `src/app/api/words/[word]/route.ts` GET handler: add `meaning_bn: cached.meaning_bn`, `example_bn: cached.example_bn`, `synonyms_bn: cached.synonyms_bn`, `antonyms_bn: cached.antonyms_bn` to the `NextResponse.json({...})` return.
- [ ] 3.2 Manual smoke via browser network tab: looking up a word should return the four new fields in the JSON response.

## 4. FETCH #3 — Vocabulary UI toggle

- [x] 4.1 Update `LookupResponse` interface in `vocabulary-search.tsx`: add `meaning_bn: string | null`, `example_bn: string | null`, `synonyms_bn: string[]`, `antonyms_bn: string[]`.
- [x] 4.2 Update `savedToLookup()` helper: add `meaning_bn: null, example_bn: null, synonyms_bn: [], antonyms_bn: []` to the returned object.
- [x] 4.3 Add `const [lang, setLang] = useState<"en" | "bn">("en")` inside `WordCard`.
- [x] 4.4 Render EN / বাং toggle buttons above the meaning section, only when `word.meaning_bn` is not null. Active tab is visually distinct (solid vs outline variant).
- [x] 4.5 Switch meaning, example, synonyms, antonyms display based on `lang`. For bn: show `meaning_bn`, `example_bn`, `synonyms_bn.slice(0, 8)`, `antonyms_bn.slice(0, 8)`. Label the meaning row "অর্থ" when in Bangla mode.

## 5. Definition-of-done

- [x] 5.1 `npm run lint && npm run typecheck` pass with zero errors.
- [ ] 5.2 Manual: search a new word → Bangla toggle appears → switching EN↔বাং updates all four sections.
- [ ] 5.3 Manual: search the same word again → served from cache → toggle still works.
- [ ] 5.4 Manual: search a word cached before this migration → no toggle visible → no crash.
- [ ] 5.5 Manual: open Games (quiz, synonym, spell, sentence) → all work correctly, English only.
- [ ] 5.6 Manual: open Review page → flashcards show English meaning only → no regression.
