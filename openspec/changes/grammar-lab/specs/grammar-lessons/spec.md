## ADDED Requirements

### Requirement: Lesson list endpoint

The system SHALL expose `GET /api/grammar/lessons?level=<cefr>` returning lessons from `grammar_lessons` filtered by the requested CEFR level. When `level` is omitted, return lessons matching the caller's `profiles.level`. Results MUST include `id`, `slug`, `title`, `level`, `topic`, and a boolean `completed` derived from the caller's `lesson_progress`.

#### Scenario: Filter by level
- **WHEN** an authenticated user requests `?level=b1`
- **THEN** only lessons with `level='b1'` are returned, each with `completed` set per the user's progress

#### Scenario: Default to user level
- **WHEN** the user has `profiles.level='a2'` and requests `/api/grammar/lessons` without a level param
- **THEN** the response contains only `a2` lessons

#### Scenario: Unauthenticated
- **WHEN** no session is present
- **THEN** the endpoint returns `401`

### Requirement: Lesson detail endpoint

The system SHALL expose `GET /api/grammar/lessons/[slug]` returning a single lesson's full content (markdown body, structured exercises, level, topic). The endpoint MUST be readable by any authenticated user (not gated by level).

#### Scenario: Existing slug
- **WHEN** the user requests `/api/grammar/lessons/present-simple`
- **THEN** the response contains the lesson body and exercises

#### Scenario: Unknown slug
- **WHEN** the slug does not match any row
- **THEN** the endpoint returns `404`

### Requirement: Seeded lesson catalog

The system SHALL seed `grammar_lessons` with at minimum the 12 English tenses (one lesson per tense) plus 4 foundational topics: articles, prepositions, conditionals, modal verbs. Each seeded lesson MUST have a unique `slug`, a CEFR `level`, a markdown `body`, and at least 5 structured exercises in its `exercises` JSONB column.

#### Scenario: All 16 lessons present after migration
- **WHEN** `003_grammar_seed.sql` is applied
- **THEN** `select count(*) from grammar_lessons` returns at least 16
- **AND** every row has a non-null `body` and `exercises` array of length ≥ 5
