-- 0007_lesson_progress.sql
-- Phase 5 (grammar-lab). Per-user lesson completion + score.
-- Depends on: 0001_profiles.sql, 0006_grammar_lessons.sql

create table if not exists lesson_progress (
  user_id uuid references profiles(id) on delete cascade,
  lesson_id uuid references grammar_lessons(id) on delete cascade,
  completed boolean default false,
  score int,
  completed_at timestamptz,
  primary key (user_id, lesson_id)
);

alter table lesson_progress enable row level security;

drop policy if exists "users own lessons" on lesson_progress;
create policy "users own lessons" on lesson_progress
  for all using (auth.uid() = user_id);

-- Verify: select count(*) from lesson_progress;
