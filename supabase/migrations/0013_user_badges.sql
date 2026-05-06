-- 0013_user_badges.sql
-- Phase 8 (engagement-pwa). Awarded-badge ledger. One row per (user, badge).
-- Depends on: 0001_profiles.sql

create table if not exists user_badges (
  user_id uuid references profiles(id) on delete cascade,
  badge_key text not null,        -- 'first_10_saved','seven_day_streak','first_lesson', ...
  earned_at timestamptz default now(),
  primary key (user_id, badge_key)
);

alter table user_badges enable row level security;

drop policy if exists "users own badges" on user_badges;
create policy "users own badges" on user_badges
  for all using (auth.uid() = user_id);

-- Verify: select count(*) from user_badges;
