-- 0001_profiles.sql
-- Phase 1 (foundation). User profile that extends auth.users.
-- Also installs the trigger that auto-creates a profile row on signup.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  level text default 'a1' check (level in ('a1','a2','b1','b2','c1','c2')),
  preferred_accent text default 'uk' check (preferred_accent in ('uk','us')),
  xp int default 0,
  streak_count int default 0,
  last_active_date date,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "users see own profile" on profiles;
create policy "users see own profile" on profiles
  for all using (auth.uid() = id);

-- Auto-create a profiles row for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Verify: select count(*) from profiles;
