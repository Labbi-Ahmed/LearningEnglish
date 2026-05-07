-- 0015_profiles_engagement_columns.sql
-- Phase 8 (engagement-pwa). Additive columns on profiles for streak/email opt-in.
-- The original profiles already has `xp` and `streak_count`; this migration adds
-- the freshness timestamp and the weekly-email opt-in flag.
-- Depends on: 0001_profiles.sql

alter table profiles add column if not exists last_active_at timestamptz;
alter table profiles add column if not exists email_weekly boolean default false;

-- Verify:
--   select column_name from information_schema.columns
--   where table_name = 'profiles' and column_name in ('last_active_at','email_weekly');
