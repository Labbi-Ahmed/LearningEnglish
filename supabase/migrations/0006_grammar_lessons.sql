-- 0006_grammar_lessons.sql
-- Phase 5 (grammar-lab). Lesson catalog. Public read-only; writes via service role.
-- Seed data lives in 0010_grammar_lessons_seed.sql.

create table if not exists grammar_lessons (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text,
  level text,
  category text,
  content jsonb,
  order_index int
);

alter table grammar_lessons enable row level security;

drop policy if exists "anyone reads grammar_lessons" on grammar_lessons;
create policy "anyone reads grammar_lessons" on grammar_lessons
  for select using (true);

-- Verify: select count(*) from grammar_lessons;
