-- 0021_plans_and_events.sql
-- Promotes tiers from a CHECK-constrained text value into a proper relational
-- model so plan metadata (name, price, billing) can be reported on, and so
-- every plan change is auditable.
--
-- Additive on top of 0020. The user_subscriptions.tier column is preserved
-- and gains a foreign key into plans(id) — application code that reads `tier`
-- continues to work unchanged.

create table if not exists plans (
  id text primary key,                            -- matches user_subscriptions.tier values
  name text not null,                             -- human label
  multiplier numeric,                             -- null = unlimited; otherwise free-tier multiplier
  price_cents int not null default 0,             -- monthly price in cents; 0 for free
  billing_interval text default 'month'           -- 'month' | 'year' | 'lifetime' | null
    check (billing_interval in ('month','year','lifetime') or billing_interval is null),
  is_active boolean not null default true,        -- soft-delete without losing history
  is_purchasable boolean not null default false,  -- false for free / author
  sort_order int not null default 0,
  created_at timestamptz default now()
);

alter table plans enable row level security;

drop policy if exists "anyone reads active plans" on plans;
create policy "anyone reads active plans" on plans
  for select using (is_active = true);

-- Seed the four plans. Multipliers mirror src/lib/quotas/limits.ts.
insert into plans (id, name, multiplier, price_cents, billing_interval, is_purchasable, sort_order) values
  ('free',    'Free',    1,    0,   'month', false, 1),
  ('pro',     'Pro',     5,    499, 'month', true,  2),
  ('pro_max', 'Pro Max', 10,   999, 'month', true,  3),
  ('author',  'Author',  null, 0,   null,    false, 99)
on conflict (id) do nothing;

-- Replace the open-text CHECK on user_subscriptions.tier with a real FK so
-- reports can join, and so unknown values are impossible.
alter table user_subscriptions drop constraint if exists user_subscriptions_tier_check;
alter table user_subscriptions drop constraint if exists user_subscriptions_tier_fkey;

alter table user_subscriptions
  add constraint user_subscriptions_tier_fkey
  foreign key (tier) references plans(id);

-- Audit table: every plan transition (signup, manual upgrade, future payment).
create table if not exists subscription_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_plan_id text references plans(id),
  to_plan_id text not null references plans(id),
  reason text not null,                           -- 'signup' | 'admin_upgrade' | 'admin_downgrade' | 'backfill' | 'cancel' | 'payment' | etc.
  notes text,
  occurred_at timestamptz default now()
);

create index if not exists subscription_events_user_idx on subscription_events (user_id, occurred_at desc);
create index if not exists subscription_events_to_plan_idx on subscription_events (to_plan_id, occurred_at desc);

alter table subscription_events enable row level security;

drop policy if exists "users see own events" on subscription_events;
create policy "users see own events" on subscription_events
  for select using (auth.uid() = user_id);

-- Mutations performed by triggers (security definer) and the service role.

-- Trigger: write an event row whenever user_subscriptions.tier changes
-- (and on every insert).
create or replace function public.log_subscription_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    insert into subscription_events (user_id, from_plan_id, to_plan_id, reason)
    values (new.user_id, null, new.tier, 'signup');
    return new;
  elsif (tg_op = 'UPDATE' and new.tier is distinct from old.tier) then
    insert into subscription_events (user_id, from_plan_id, to_plan_id, reason)
    values (
      new.user_id,
      old.tier,
      new.tier,
      case
        when new.tier = 'free' then 'cancel'
        when (select sort_order from plans where id = new.tier) >
             (select sort_order from plans where id = old.tier) then 'admin_upgrade'
        else 'admin_downgrade'
      end
    );
    return new;
  end if;
  return new;
end;
$$;

drop trigger if exists on_subscription_change on user_subscriptions;
create trigger on_subscription_change
  after insert or update on user_subscriptions
  for each row execute function public.log_subscription_event();

-- One-time backfill: synthesize an event for every existing subscription so
-- reports always have a starting datum.
insert into subscription_events (user_id, from_plan_id, to_plan_id, reason, occurred_at)
select us.user_id, null, us.tier, 'backfill', coalesce(us.plan_started_at, us.updated_at, now())
from user_subscriptions us
where not exists (
  select 1 from subscription_events se where se.user_id = us.user_id
);

-- Reporting helpers (read-only views with RLS-friendly definitions).
create or replace view plan_distribution as
  select p.id as plan_id, p.name, p.price_cents, p.billing_interval,
         count(us.user_id) as active_users
  from plans p
  left join user_subscriptions us on us.tier = p.id
  group by p.id, p.name, p.price_cents, p.billing_interval, p.sort_order
  order by p.sort_order;

-- Verify:
--   select * from plans order by sort_order;
--   select * from plan_distribution;
--   select * from subscription_events order by occurred_at desc limit 20;
