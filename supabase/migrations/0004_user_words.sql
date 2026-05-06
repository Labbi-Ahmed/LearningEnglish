-- 0004_user_words.sql
-- Phase 2 + Phase 4. Per-user word bank with SM-2 spaced-repetition fields.
-- Depends on: 0001_profiles.sql, 0002_words.sql

create table if not exists user_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  word_id uuid references words(id) on delete cascade,
  mastery_level int default 0,
  ease_factor numeric default 2.5,
  interval_days int default 1,
  repetitions int default 0,
  next_review_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (user_id, word_id)
);

create index if not exists user_words_due_idx on user_words (user_id, next_review_at);

alter table user_words enable row level security;

drop policy if exists "users own words" on user_words;
create policy "users own words" on user_words
  for all using (auth.uid() = user_id);

-- Verify: select count(*) from user_words where user_id = auth.uid();
