-- 001_initial_schema.sql
-- Initial schema for the English Learning App.
-- Run once on a fresh Supabase project. Do not edit; create new migrations for changes.

-- ---------------------------------------------------------------
-- profiles (extends auth.users)
-- ---------------------------------------------------------------
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

-- ---------------------------------------------------------------
-- words (shared dictionary cache)
-- ---------------------------------------------------------------
create table if not exists words (
  id uuid primary key default gen_random_uuid(),
  word text unique not null,
  pos text,
  meaning text,
  ipa_uk text,
  ipa_us text,
  example text,
  difficulty text default 'b1',
  created_at timestamptz default now()
);

create index if not exists words_word_idx on words (lower(word));

create table if not exists word_relations (
  word_id uuid references words(id) on delete cascade,
  related_text text,
  relation_type text check (relation_type in ('synonym','antonym')),
  primary key (word_id, related_text, relation_type)
);

-- ---------------------------------------------------------------
-- user_words (personal bank + SM-2 spaced repetition)
-- ---------------------------------------------------------------
create table if not exists user_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  word_id uuid references words(id) on delete cascade,
  mastery_level int default 0,
  ease_factor numeric default 2.5,
  interval_days int default 1,
  repetitions int default 0,
  next_review_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(user_id, word_id)
);

create index if not exists user_words_due_idx on user_words (user_id, next_review_at);

-- ---------------------------------------------------------------
-- game_sessions
-- ---------------------------------------------------------------
create table if not exists game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  game_type text check (game_type in ('spell','sentence','synonym','quiz','flashcard')),
  score int,
  duration_seconds int,
  words_practiced uuid[],
  created_at timestamptz default now()
);

create index if not exists game_sessions_user_idx on game_sessions (user_id, created_at desc);

-- ---------------------------------------------------------------
-- grammar_lessons + lesson_progress
-- ---------------------------------------------------------------
create table if not exists grammar_lessons (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text,
  level text,
  category text,
  content jsonb,
  order_index int
);

create table if not exists lesson_progress (
  user_id uuid references profiles(id) on delete cascade,
  lesson_id uuid references grammar_lessons(id) on delete cascade,
  completed boolean default false,
  score int,
  completed_at timestamptz,
  primary key (user_id, lesson_id)
);

-- ---------------------------------------------------------------
-- speaking_recordings
-- ---------------------------------------------------------------
create table if not exists speaking_recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  target_text text,
  audio_url text,
  accent text check (accent in ('uk','us')),
  accuracy_score numeric,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------
-- ai_conversations
-- ---------------------------------------------------------------
create table if not exists ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  scenario text,
  messages jsonb,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------
alter table profiles enable row level security;
alter table user_words enable row level security;
alter table game_sessions enable row level security;
alter table lesson_progress enable row level security;
alter table speaking_recordings enable row level security;
alter table ai_conversations enable row level security;
alter table words enable row level security;
alter table word_relations enable row level security;
alter table grammar_lessons enable row level security;

create policy "users see own profile" on profiles for all using (auth.uid() = id);
create policy "users own words" on user_words for all using (auth.uid() = user_id);
create policy "users own games" on game_sessions for all using (auth.uid() = user_id);
create policy "users own lessons" on lesson_progress for all using (auth.uid() = user_id);
create policy "users own recordings" on speaking_recordings for all using (auth.uid() = user_id);
create policy "users own chats" on ai_conversations for all using (auth.uid() = user_id);

-- Public read-only reference data
create policy "anyone reads words" on words for select using (true);
create policy "anyone reads word_relations" on word_relations for select using (true);
create policy "anyone reads grammar_lessons" on grammar_lessons for select using (true);

-- ---------------------------------------------------------------
-- Auto-create a profiles row for every new auth user
-- ---------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
