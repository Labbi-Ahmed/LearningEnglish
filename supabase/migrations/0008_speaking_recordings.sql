-- 0008_speaking_recordings.sql
-- Phase 6 (speaking-ai). Voice clip metadata + accuracy score.
-- Audio bytes themselves live in the `speaking` storage bucket.
-- Depends on: 0001_profiles.sql

create table if not exists speaking_recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  target_text text,
  audio_url text,
  accent text check (accent in ('uk','us')),
  accuracy_score numeric,
  created_at timestamptz default now()
);

alter table speaking_recordings enable row level security;

drop policy if exists "users own recordings" on speaking_recordings;
create policy "users own recordings" on speaking_recordings
  for all using (auth.uid() = user_id);

-- Verify: select count(*) from speaking_recordings;
