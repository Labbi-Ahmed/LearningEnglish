## ADDED Requirements

### Requirement: Initial migration file is the single source of truth

The system SHALL apply its initial schema via `supabase/migrations/001_initial_schema.sql`. This file SHALL contain all tables, indexes, RLS policies, functions, and triggers needed for Phase 1. Once merged to `main`, this file SHALL NOT be edited; subsequent schema changes SHALL be added as new files (`002_*.sql`, `003_*.sql`, …).

#### Scenario: Migration applies cleanly to an empty database

- **WHEN** `001_initial_schema.sql` is applied to an empty Postgres database with the `auth` schema present (Supabase default)
- **THEN** every statement SHALL succeed and the database SHALL contain all tables, indexes, policies, and triggers defined in the migration

### Requirement: Core tables exist

The system SHALL create the following tables: `profiles`, `words`, `word_relations`, `user_words`, `game_sessions`, `grammar_lessons`, `lesson_progress`, `speaking_recordings`, `ai_conversations`. Column shapes SHALL match `Project-plan/DB.md`.

#### Scenario: All nine tables present after migration

- **WHEN** the migration has been applied
- **THEN** each of the nine tables SHALL exist in the `public` schema with the columns specified in `Project-plan/DB.md`

### Requirement: Row Level Security on every table

The system SHALL enable RLS on every table created by `001_initial_schema.sql`. User-owned tables SHALL have policies restricting access to rows where `auth.uid() = user_id`. Shared dictionary tables (`words`, `word_relations`, `grammar_lessons`) SHALL have read-only policies for the `authenticated` role; writes SHALL be permitted only via the service role.

#### Scenario: Authenticated user cannot read another user's words

- **WHEN** user A authenticates and queries `user_words` with no filter
- **THEN** the query SHALL return only rows where `user_words.user_id = A.id`, regardless of how many rows other users have

#### Scenario: Authenticated user can read shared dictionary

- **WHEN** any authenticated user queries the `words` table for an existing entry
- **THEN** the query SHALL succeed and return the row

#### Scenario: Authenticated user cannot write to shared dictionary

- **WHEN** an authenticated user (using the anon/authenticated role) attempts to INSERT into `words`
- **THEN** the operation SHALL be rejected by RLS

#### Scenario: Anonymous user cannot read user-owned tables

- **WHEN** an unauthenticated request queries any user-owned table
- **THEN** RLS SHALL return zero rows or reject the query

### Requirement: Profile creation trigger

The system SHALL create a Postgres function `handle_new_user()` and a trigger on `auth.users` that inserts a corresponding row into `profiles` whenever a new auth user is created. The new profile SHALL pick up column defaults: `level = 'a1'`, `preferred_accent = 'uk'`, `xp = 0`.

#### Scenario: Profile row is created on signup

- **WHEN** a new user signs up via Supabase Auth (email or OAuth)
- **THEN** a row in `profiles` with the same `id` as the new auth user SHALL exist immediately after signup completes, with the documented defaults

#### Scenario: Trigger runs with elevated privileges

- **WHEN** the trigger inserts into `profiles`
- **THEN** the function SHALL run as `SECURITY DEFINER` so the insert succeeds despite RLS

### Requirement: SM-2 columns on user_words

The system SHALL include the SM-2 spaced repetition columns (`ease_factor`, `interval_days`, `repetitions`, `next_review_at`) on `user_words` with defaults appropriate for a brand-new card. The Phase 4 algorithm will read and write these columns; Phases 2 and 3 SHALL only insert rows with the defaults and SHALL NOT mutate the SM-2 fields.

#### Scenario: New saved word starts as a fresh SM-2 card

- **WHEN** a user saves a word for the first time in Phase 2
- **THEN** the resulting `user_words` row SHALL have `ease_factor = 2.5`, `interval_days = 1`, `repetitions = 0`, and `next_review_at` set to now (so the card is immediately reviewable once Phase 4 ships)

### Requirement: Indexes for hot queries

The system SHALL create indexes that support the queries Phase 2 onward will run: `user_words(user_id, next_review_at)` for the review queue, `game_sessions(user_id, created_at desc)` for activity feeds, and a `lower(word)` index on `words` for case-insensitive dictionary cache lookups (the `word` column itself carries a `unique` constraint).

#### Scenario: Review queue query uses an index

- **WHEN** the query planner is asked to fetch due `user_words` for a given user
- **THEN** it SHALL use the `(user_id, next_review_at)` index rather than a sequential scan
