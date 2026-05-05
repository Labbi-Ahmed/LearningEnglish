## ADDED Requirements

### Requirement: Save word to personal bank

The system SHALL expose `POST /api/words/save` that accepts `{ word: string }` (a lowercase English word) and creates a `user_words` row tying the authenticated caller to the corresponding `words.id`. If the word is not yet in the cache, the endpoint MUST resolve it through the same cache-first lookup pipeline as `GET /api/words/[word]` before linking. The operation MUST be idempotent: saving the same word twice MUST NOT create duplicate `user_words` rows and MUST return `200` on the second call.

#### Scenario: Save a cached word
- **WHEN** an authenticated user POSTs `{ "word": "hello" }` and `hello` already exists in `words`
- **THEN** a single `user_words(user_id = auth.uid(), word_id = ...)` row is inserted
- **AND** the response is `200` with `{ saved: true, word_id }`

#### Scenario: Save an uncached word
- **WHEN** an authenticated user saves a word not yet in `words`
- **THEN** the endpoint first populates `words` (and `word_relations`) via the lookup pipeline, then inserts the `user_words` row
- **AND** the response is `200` with `{ saved: true, word_id }`

#### Scenario: Save the same word twice
- **WHEN** the same authenticated user POSTs the same word twice in a row
- **THEN** the second call returns `200` with `{ saved: true, already: true }`
- **AND** the `user_words` table contains exactly one matching row for that user

#### Scenario: Word not found upstream
- **WHEN** the user attempts to save a word the Free Dictionary API does not know
- **THEN** the endpoint returns `404` with `{ error: "word_not_found" }`
- **AND** no `user_words` row is inserted

#### Scenario: Unauthenticated caller
- **WHEN** an unauthenticated request hits `POST /api/words/save`
- **THEN** the endpoint returns `401`

### Requirement: List saved words

The system SHALL expose `GET /api/words` returning the authenticated user's saved words, joined to `words` so each item includes `word`, `pos`, `meaning`, `ipa_uk`, `ipa_us`, and the saved-row `id` and `created_at`. Results MUST be ordered by `created_at desc`. The endpoint MUST support `?q=<text>` for case-insensitive substring search against `words.word` and `?limit=<n>&offset=<n>` pagination with default `limit = 20` (max 100).

#### Scenario: Default list
- **WHEN** an authenticated user GETs `/api/words`
- **THEN** the endpoint returns up to 20 of their saved words ordered most-recent-first
- **AND** RLS prevents another user's rows from appearing

#### Scenario: Search filter
- **WHEN** the user GETs `/api/words?q=ser`
- **THEN** the response contains only rows where `words.word ILIKE '%ser%'`

#### Scenario: Pagination bounds
- **WHEN** the user GETs `/api/words?limit=500`
- **THEN** the endpoint clamps `limit` to 100 and returns at most 100 rows

### Requirement: Remove saved word

The system SHALL expose `DELETE /api/words/[id]` where `[id]` is a `user_words.id`. The endpoint MUST delete the row only when it belongs to the caller (enforced by RLS). The operation MUST be idempotent: deleting an id that does not exist (or no longer belongs to the caller) MUST return `204`.

#### Scenario: Owner deletes their saved word
- **WHEN** the authenticated owner DELETEs `/api/words/<their-row-id>`
- **THEN** the row is removed and the response is `204`

#### Scenario: Non-owner attempts delete
- **WHEN** an authenticated user DELETEs a `user_words.id` belonging to a different user
- **THEN** RLS prevents the delete and the endpoint returns `204` (idempotent — caller cannot infer whether the row exists)

### Requirement: Vocabulary bank UI

The `/vocabulary` page SHALL render the user's saved-word list with: a search input bound to `?q=`, infinite or paginated loading, a per-row remove button, and an empty-state when the user has zero saved words. The list MUST update optimistically when a word is saved from the lookup UI on the same page.

#### Scenario: Optimistic save
- **WHEN** the user clicks "Save to my words" on a lookup result
- **THEN** the saved-word list shows the new word immediately, before the server confirms
- **AND** if the server save fails, the optimistic row is rolled back and an error toast is shown

#### Scenario: Empty state
- **WHEN** an authenticated user with zero saved words opens `/vocabulary`
- **THEN** the list area renders a friendly empty state inviting them to look up their first word
