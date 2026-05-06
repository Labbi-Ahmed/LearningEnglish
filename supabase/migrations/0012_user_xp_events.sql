-- 0012_user_xp_events.sql
-- Phase 8 (engagement-pwa). XP ledger — one row per granting event.
-- Idempotent grants are enforced via unique (user_id, source, ref_id).
-- Streak is derived from distinct UTC days in this table.
-- Depends on: 0001_profiles.sql

create table if not exists user_xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  source text not null,           -- 'spell','sentence','synonym','quiz','review','grammar','speaking','chat'
  ref_id uuid not null,           -- id of the row that triggered the grant
  amount int not null check (amount >= 0),
  created_at timestamptz default now(),
  unique (user_id, source, ref_id)
);

create index if not exists user_xp_events_user_day_idx
  on user_xp_events (user_id, created_at desc);

alter table user_xp_events enable row level security;

drop policy if exists "users own xp events" on user_xp_events;
create policy "users own xp events" on user_xp_events
  for all using (auth.uid() = user_id);

-- Verify: select count(*) from user_xp_events;
