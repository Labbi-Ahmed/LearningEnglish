-- 0014_push_subscriptions.sql
-- Phase 8 (engagement-pwa). Web Push subscription per (user, endpoint).
-- Daily-reminder cron reads this table; users may have multiple devices.
-- Depends on: 0001_profiles.sql

create table if not exists push_subscriptions (
  user_id uuid references profiles(id) on delete cascade,
  endpoint text not null,
  keys jsonb not null,            -- { p256dh, auth }
  created_at timestamptz default now(),
  primary key (user_id, endpoint)
);

alter table push_subscriptions enable row level security;

drop policy if exists "users own push subs" on push_subscriptions;
create policy "users own push subs" on push_subscriptions
  for all using (auth.uid() = user_id);

-- Verify: select count(*) from push_subscriptions;
