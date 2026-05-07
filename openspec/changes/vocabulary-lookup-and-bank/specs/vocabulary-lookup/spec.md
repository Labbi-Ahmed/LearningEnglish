## ADDED Requirements

### Requirement: Cache-first word lookup endpoint

The system SHALL expose `GET /api/words/[word]` that returns a normalized dictionary payload for an English word, served from the shared `words` table when present, and otherwise fetched from the Free Dictionary API, persisted, and returned.

The lookup MUST be case-insensitive and the lowercase form MUST be the canonical key. A word that has already been fetched once MUST NOT trigger an outbound HTTP call on subsequent lookups by any user. The persisted row MUST include `word`, `pos` (part of speech), `ipa_uk`, `ipa_us`, `meaning`, and `example` columns when the upstream API supplies them; missing fields MAY be `null`.

#### Scenario: Cache hit
- **WHEN** an authenticated user requests `GET /api/words/Hello` and a row with `word = 'hello'` already exists in `words`
- **THEN** the endpoint returns the existing row plus its `word_relations` (synonyms / antonyms) without calling the Free Dictionary API
- **AND** the response status is `200`

#### Scenario: Cache miss with successful upstream lookup
- **WHEN** an authenticated user requests `GET /api/words/serendipity` and no row exists in `words`
- **THEN** the system calls `https://api.dictionaryapi.dev/api/v2/entries/en/serendipity`, parses the response, inserts one row into `words` (lowercase), inserts one row per synonym and antonym into `word_relations`, and returns the normalized payload
- **AND** a subsequent identical request from any user is served entirely from the database

#### Scenario: Word not found upstream
- **WHEN** the Free Dictionary API responds with `404` for the requested word
- **THEN** the endpoint returns `404` with a JSON body `{ error: "word_not_found" }`
- **AND** no row is inserted into `words`

#### Scenario: Upstream rate limit or transient failure
- **WHEN** the Free Dictionary API responds with `5xx`, times out, or returns an unexpected shape
- **THEN** the endpoint returns `502` with a JSON body `{ error: "lookup_unavailable" }` and logs the upstream error server-side

#### Scenario: Unauthenticated caller
- **WHEN** an unauthenticated request hits `GET /api/words/[word]`
- **THEN** the endpoint returns `401`

### Requirement: Free Dictionary API wrapper

The system SHALL provide a `lib/dictionary.ts` module that encapsulates Free Dictionary API access, validates the response shape with Zod, and normalizes it into the `{ word, pos, ipa_uk, ipa_us, meaning, example, synonyms[], antonyms[] }` shape consumed by the lookup endpoint. No other module SHALL call the Free Dictionary API directly.

#### Scenario: Normalized output
- **WHEN** the wrapper is invoked with a word the upstream API knows
- **THEN** it returns a single normalized object with deduplicated `synonyms` and `antonyms` arrays (lowercase, trimmed)
- **AND** picks `ipa_uk` / `ipa_us` from the phonetics array using audio-URL hints (`-uk.mp3`, `-us.mp3`) or `text` fallback

#### Scenario: Zod validation failure
- **WHEN** the upstream returns a payload that does not match the expected schema
- **THEN** the wrapper throws a typed `DictionaryParseError` rather than returning malformed data

### Requirement: Accent-aware browser TTS helpers

The system SHALL expose `speak(text, accent)` and `cancelSpeech()` from `lib/speech.ts`, where `accent` is `'uk' | 'us'`. The helpers MUST select a `SpeechSynthesisVoice` whose `lang` starts with `en-GB` (uk) or `en-US` (us) when available, fall back to any English voice, and no-op safely when `window.speechSynthesis` is undefined (SSR or unsupported browsers).

#### Scenario: UK voice available
- **WHEN** the browser exposes at least one `en-GB` voice and `speak('hello', 'uk')` is called
- **THEN** an utterance is queued with that voice

#### Scenario: No voices available
- **WHEN** `speechSynthesis.getVoices()` returns an empty array
- **THEN** `speak()` returns without throwing and emits no console error

### Requirement: Vocabulary lookup UI

The dashboard SHALL provide a `/vocabulary` page where an authenticated user can enter a word, see its meaning, IPA (UK + US), part of speech, an example sentence, synonyms, and antonyms, hear UK and US pronunciations via two distinct buttons, and save the word to their personal bank.

#### Scenario: Successful lookup and save
- **WHEN** a user types `serendipity` into the search box and submits
- **THEN** the page calls `GET /api/words/serendipity`, renders the result, and displays a "Save to my words" button
- **AND** clicking that button calls `POST /api/words/save` with the returned word id and shows a saved confirmation

#### Scenario: Word not found
- **WHEN** the lookup endpoint returns `404`
- **THEN** the page renders a friendly "We couldn't find that word — check the spelling" message and no card is shown

#### Scenario: Pronunciation buttons
- **WHEN** the user clicks the "Play UK" button on a result card
- **THEN** the page invokes `speak(word, 'uk')`
- **AND** clicking "Play US" invokes `speak(word, 'us')`
