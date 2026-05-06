-- 0005_game_sessions.sql
-- Phase 3 (games-core). One row per finished game round.
-- Depends on: 0001_profiles.sql

create table if not exists game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  game_type text check (game_type in ('spell','sentence','synonym','quiz','flashcard')),
  score int,
  duration_seconds int,
  words_practiced uuid[],
  created_at timestamptz default now()
);

create index if not exists game_sessions_user_idx
  on game_sessions (user_id, created_at desc);

alter table game_sessions enable row level security;

drop policy if exists "users own games" on game_sessions;
create policy "users own games" on game_sessions
  for all using (auth.uid() = user_id);

-- Verify: select count(*) from game_sessions;
