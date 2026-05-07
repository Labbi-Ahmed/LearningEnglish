# Supabase migrations

One file per logical change (typically one table + its indexes + RLS + policies).
Files are numbered `NNNN_<topic>.sql` and meant to be run in order on a fresh
Supabase project via the dashboard's SQL editor.

## Conventions

- **Idempotent**: every file uses `create table if not exists`, `create index if not exists`,
  `drop policy if exists` before `create policy`, `create or replace function`, and
  `drop trigger if exists` before `create trigger`. Re-running a file is a no-op.
- **One concern per file**: a single table (with its indexes + RLS) or a single
  additive change (e.g., adding columns to `profiles`).
- **Never edit a file once it has been applied to any environment**. Add a new
  numbered file instead.
- **Numbering**: pad to 4 digits. Reserve gaps if a phase has multiple migrations.
- **Per-user tables MUST cascade**: any new table that stores per-user rows
  must declare `references auth.users(id) on delete cascade` (or
  `references profiles(id) on delete cascade`) so admin hard-delete keeps
  working. Global / shared tables (e.g. `words`, `word_relations`,
  `grammar_lessons`, `ai_rephrase_cache`) intentionally have no user FK and
  must survive deletion.

## Order (current + planned)

| #    | File                                  | Phase | Status |
|------|---------------------------------------|-------|--------|
| 0001 | `0001_profiles.sql`                   | 1 — foundation        | required |
| 0002 | `0002_words.sql`                      | 2 — vocabulary        | required |
| 0003 | `0003_word_relations.sql`             | 2 — vocabulary        | required |
| 0004 | `0004_user_words.sql`                 | 2/4 — vocab + SM-2    | required |
| 0005 | `0005_game_sessions.sql`              | 3 — games             | required |
| 0006 | `0006_grammar_lessons.sql`            | 5 — grammar           | required |
| 0007 | `0007_lesson_progress.sql`            | 5 — grammar           | required |
| 0008 | `0008_speaking_recordings.sql`        | 6 — speaking          | required |
| 0009 | `0009_ai_conversations.sql`           | 6 — AI                | required |
| 0010 | `0010_grammar_lessons_seed.sql`       | 5 — grammar           | required |
| 0011 | `0011_ai_rephrase_cache.sql`          | 6 — speaking-ai       | future   |
| 0012 | `0012_user_xp_events.sql`             | 8 — engagement        | future   |
| 0013 | `0013_user_badges.sql`                | 8 — engagement        | future   |
| 0014 | `0014_push_subscriptions.sql`         | 8 — engagement        | future   |
| 0015 | `0015_profiles_engagement_columns.sql`| 8 — engagement        | future   |

## How to apply on a fresh server

1. Open Supabase Dashboard → SQL Editor.
2. For each `.sql` file in numerical order: paste contents, run.
3. Verify with the queries inside each file's footer comment, e.g.
   `select count(*) from grammar_lessons;` should return 16 after `0010`.

## How to apply a single new migration on an existing server

Just run that one file. All files are safe to re-run, so if you're unsure
whether something was applied, run it again.
