-- 0022_admin_audit_and_active.sql
-- Adds the deactivation flag on profiles and the admin audit log used by
-- the author-only user-management surface.
--
-- Deactivation: profiles.is_active=false → server-side guards reject the
-- session and sign the user out. Hard delete remains a separate action and
-- relies on the existing on-delete cascades from auth.users(id) /
-- profiles(id) on every per-user table.

-- 1) Deactivation flag.
alter table profiles
  add column if not exists is_active boolean not null default true;

-- 2) Append-only admin audit log.
-- target_id is intentionally NOT a foreign key: a hard-deleted user must
-- still have their audit history.
create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  target_id uuid not null,
  action text not null check (action in ('deactivate','reactivate','delete')),
  reason text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx on admin_audit_log (created_at desc);
create index if not exists admin_audit_log_target_idx on admin_audit_log (target_id);

alter table admin_audit_log enable row level security;

-- Authors (tier='author') can read the audit log. No INSERT/UPDATE/DELETE
-- policies → mutations require the service role.
drop policy if exists "authors read audit log" on admin_audit_log;
create policy "authors read audit log" on admin_audit_log
  for select using (
    exists (
      select 1 from user_subscriptions us
      where us.user_id = auth.uid() and us.tier = 'author'
    )
  );

-- 3) Cascade audit. Every per-user table currently cascades from either
-- auth.users(id) or profiles(id):
--   profiles                    → auth.users(id) on delete cascade
--   user_words                  → profiles(id)   on delete cascade
--   game_sessions               → profiles(id)   on delete cascade
--   lesson_progress             → profiles(id)   on delete cascade
--   speaking_recordings         → profiles(id)   on delete cascade
--   ai_conversations            → profiles(id)   on delete cascade
--   user_xp_events              → profiles(id)   on delete cascade
--   user_badges                 → profiles(id)   on delete cascade
--   push_subscriptions          → profiles(id)   on delete cascade
--   user_subscriptions          → auth.users(id) on delete cascade
--   daily_usage                 → auth.users(id) on delete cascade
--   subscription_events         → auth.users(id) on delete cascade
-- The shared knowledge tables `words` and `word_relations` are NOT keyed
-- by user and MUST survive deletes (free-tier cache discipline).
-- Any future per-user table MUST cascade from auth.users(id) or profiles(id).

-- Verify:
--   select column_name, data_type, column_default from information_schema.columns
--     where table_name='profiles' and column_name='is_active';
--   select count(*) from admin_audit_log;
--   -- The query below should return only `words` and `word_relations` (and
--   -- non-user tables like plans, grammar_lessons, ai_rephrase_cache):
--   select t.relname
--     from pg_class t
--     join pg_namespace n on n.oid = t.relnamespace
--     where n.nspname='public' and t.relkind='r'
--       and not exists (
--         select 1 from pg_constraint c
--         where c.conrelid = t.oid and c.contype='f'
--           and c.confrelid in ('auth.users'::regclass, 'public.profiles'::regclass)
--       );
