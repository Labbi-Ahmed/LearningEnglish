## ADDED Requirements

### Requirement: Bangla translation at first word lookup

The system SHALL translate the English `meaning`, `example`, and the word itself to Bangla at the time a new word is first inserted into the `words` table, using the MyMemory API (`en→bn`). The translated values SHALL be stored in `meaning_bn`, `example_bn`, and `word_bn` on the `words` row. Translation SHALL be performed via `Promise.all()` so all calls run in parallel. If any individual translation call fails, the failed field SHALL be stored as `null` and the English data SHALL still be returned — translation failure MUST NOT cause the word lookup to fail.

#### Scenario: New word — translation succeeds
- **WHEN** an authenticated user looks up a word not yet in the `words` table AND the MyMemory API responds successfully
- **THEN** the inserted `words` row has non-null `meaning_bn`, `example_bn`, and `word_bn`
- **AND** the API response includes all three bn fields

#### Scenario: New word — translation fails (network error or rate limit)
- **WHEN** an authenticated user looks up a new word AND the MyMemory API returns an error or times out
- **THEN** the word is still inserted with English fields populated and bn fields as `null`
- **AND** the API response returns English data normally with `meaning_bn: null`
- **AND** no error is surfaced to the user

#### Scenario: Cached word — bn fields already populated
- **WHEN** an authenticated user looks up a word that already exists in `words` with non-null `meaning_bn`
- **THEN** `upsertWordFromDictionary()` returns the cached bn fields without calling MyMemory
- **AND** the API response includes the populated bn fields

#### Scenario: Cached word — bn fields are null (pre-migration cache)
- **WHEN** an authenticated user looks up a word cached before this migration (meaning_bn IS NULL)
- **THEN** `upsertWordFromDictionary()` returns the English data with `meaning_bn: null` and does NOT re-trigger translation
- **AND** the API response includes `meaning_bn: null`

### Requirement: Bangla translation of synonyms and antonyms

The system SHALL translate each synonym and antonym stored in `word_relations` to Bangla at the time the relations are first inserted, saving the result in `related_text_bn`. If translation of an individual relation fails, `related_text_bn` SHALL be stored as `null` for that row only. Failure SHALL NOT block other relations or the parent word from being saved.

#### Scenario: Relations translated successfully
- **WHEN** a new word is inserted and has synonyms/antonyms
- **THEN** each `word_relations` row has a non-null `related_text_bn` (assuming MyMemory responds)

#### Scenario: One relation translation fails
- **WHEN** one MyMemory call for a synonym returns an error
- **THEN** only that relation's `related_text_bn` is null; all other rows are saved normally

### Requirement: MyMemory translation helper

The system SHALL expose `translateTobn(text: string): Promise<string | null>` in `src/lib/translate.ts` (server-side only). It SHALL call `https://api.mymemory.translated.net/get?q=<encoded>&langpair=en|bn`, parse `responseData.translatedText`, and return the string. It SHALL return `null` on any of: network error, non-200 status, JSON parse failure, empty translated string.

#### Scenario: Successful translation
- **WHEN** MyMemory returns `{ responseData: { translatedText: "আপেল" }, responseStatus: 200 }`
- **THEN** `translateTobn("apple")` resolves to `"আপেল"`

#### Scenario: API error
- **WHEN** MyMemory returns a non-200 status or throws a network error
- **THEN** `translateTobn()` resolves to `null` (never rejects)
