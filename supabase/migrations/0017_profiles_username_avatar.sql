-- 0017_profiles_username_avatar.sql
-- Phase: user-profile. Adds first_name, last_name, avatar_url to profiles.
-- Also updates the new-user trigger to populate names from auth metadata.
-- Depends on: 0001_profiles.sql

alter table profiles add column if not exists first_name text;
alter table profiles add column if not exists last_name  text;
alter table profiles add column if not exists avatar_url text;

-- Update trigger so signup name fields are stored in the profile automatically.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, display_name)
  values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    trim(
      coalesce(new.raw_user_meta_data->>'first_name', '') || ' ' ||
      coalesce(new.raw_user_meta_data->>'last_name', '')
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Verify:
--   select column_name from information_schema.columns
--   where table_name = 'profiles'
--   and column_name in ('first_name','last_name','avatar_url');
