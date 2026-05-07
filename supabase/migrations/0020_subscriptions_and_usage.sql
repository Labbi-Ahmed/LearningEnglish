-- 0020_subscriptions_and_usage.sql
-- Phase: rate-limits-and-tiers.
-- Adds per-user subscription tier and a daily usage counter table used by the
-- quota enforcement helper. Tier values: free | pro | pro_max | author.
-- Author bypasses all quota checks. Manual upgrade via service-role SQL.

create table if not exists user_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free','pro','pro_max','author')),
  plan_started_at timestamptz default now(),
  plan_expires_at timestamptz,
  updated_at timestamptz default now()
);

alter table user_subscriptions enable row level security;

drop policy if exists "users see own subscription" on user_subscriptions;
create policy "users see own subscription" on user_subscriptions
  for select using (auth.uid() = user_id);

-- No update/insert/delete policies → mutations require service role.

create table if not exists daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  day date not null default (now() at time zone 'utc')::date,
  count int not null default 0,
  primary key (user_id, action, day)
);

alter table daily_usage enable row level security;

drop policy if exists "users see own usage" on daily_usage;
create policy "users see own usage" on daily_usage
  for select using (auth.uid() = user_id);

-- Mutations performed by the enforcement helper using the service-role client.

create index if not exists daily_usage_user_day_idx on daily_usage (user_id, day);

-- Auto-create a free subscription row for every new auth user.
create or replace function public.handle_new_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_subscriptions (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_subscription on auth.users;
create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row execute function public.handle_new_subscription();

-- Backfill: ensure every existing user has a subscription row.
insert into public.user_subscriptions (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- Atomic check-and-increment used by the quota enforcement helper.
-- Returns the post-increment count on success, or NULL when the user is
-- already at or above the limit (caller treats NULL as quota_exceeded).
-- Author tier should short-circuit in application code; this function does
-- not look up tier — it just enforces the supplied numeric limit.
create or replace function public.consume_daily_quota(
  p_user_id uuid,
  p_action text,
  p_limit int
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_count int;
begin
  insert into daily_usage (user_id, action, day, count)
  values (p_user_id, p_action, v_today, 1)
  on conflict (user_id, action, day)
  do update set count = daily_usage.count + 1
  where daily_usage.count < p_limit
  returning count into v_count;

  return v_count; -- null if conflict and where failed
end;
$$;

revoke all on function public.consume_daily_quota(uuid, text, int) from public;
grant execute on function public.consume_daily_quota(uuid, text, int) to service_role;

-- Verify:
--   select tier, count(*) from user_subscriptions group by tier;
--   select * from daily_usage where day = (now() at time zone 'utc')::date;
