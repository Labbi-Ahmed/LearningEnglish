---
name: migration
description: Create a new Supabase SQL migration file with proper RLS policies, idempotency guards, and correct naming convention. Use when the user needs to add a table, add columns, change the database schema, or create a migration.
license: MIT
compatibility: Supabase Postgres, Next.js 15 TypeScript project.
metadata:
  author: project
  version: "1.0"
---

Create the next migration file in `supabase/migrations/` following the project's conventions.

**Input**: `<description of what this migration does>`
**Example**: `/migration add streak_count column to profiles`

---

## Step 1 — Determine the next sequence number

```bash
ls supabase/migrations/*.sql | sort | tail -1
```

Extract the 4-digit prefix and increment by 1. Example: `0016_...` → next is `0017`.

## Step 2 — Name the file

`supabase/migrations/<NNNN>_<snake_case_description>.sql`

Good examples:
- `0017_add_streak_count_to_profiles.sql`
- `0018_create_daily_goals_table.sql`
- `0019_add_transcript_to_speaking_recordings.sql`

## Step 3 — Write the migration

### Required header comment

```sql
-- <filename>
-- <One sentence: what this migration does and why>.
-- Depends on: <list migration files this depends on, e.g. 0001_profiles.sql>
```

### New table pattern

```sql
create table if not exists <table_name> (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade,
  -- domain columns
  created_at  timestamptz default now()
);
```

### Always enable RLS on every new table — never skip this

```sql
alter table <table_name> enable row level security;
```

### RLS policy patterns

**User-owned data** (most tables):
```sql
drop policy if exists "users own <table_name>" on <table_name>;
create policy "users own <table_name>" on <table_name>
  for all using (auth.uid() = user_id);
```

**Public read, authenticated write**:
```sql
drop policy if exists "public read <table_name>" on <table_name>;
create policy "public read <table_name>" on <table_name>
  for select using (true);

drop policy if exists "auth write <table_name>" on <table_name>;
create policy "auth write <table_name>" on <table_name>
  for insert with check (auth.uid() = user_id);
```

**Service-only write** (e.g. cache tables):
```sql
drop policy if exists "public read <table_name>" on <table_name>;
create policy "public read <table_name>" on <table_name>
  for select using (true);
-- writes happen via service role only — no insert/update policy needed for users
```

### Adding columns to existing tables

```sql
alter table <table_name> add column if not exists <column_name> <type>;
```

`if not exists` makes migrations idempotent — always use it.

### Required verification comment at end

```sql
-- Verify: select count(*) from <table_name>;
```

## Hard rules

- **Never edit existing migration files** — always create a new file
- `drop policy if exists` BEFORE every `create policy` — prevents errors on re-run
- Foreign keys reference `profiles(id)` not `auth.users(id)` — `profiles` is the project's user table
- `timestamptz` not `timestamp` for all datetime columns
- No stored procedures, triggers, or functions in MVP
- After creating the file, remind the user: **apply it via Supabase dashboard → SQL Editor**
