-- profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  level text default 'a1' check (level in ('a1','a2','b1','b2','c1','c2')),
  preferred_accent text default 'uk' check (preferred_accent in ('uk','us')),
  xp int default 0,
  streak_count int default 0,
  last_active_date date,
  created_at timestamptz default now()
);

-- words (shared cache of dictionary lookups)
create table words (
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

create table word_relations (
  word_id uuid references words(id) on delete cascade,
  related_text text,
  relation_type text check (relation_type in ('synonym','antonym')),
  primary key (word_id, related_text, relation_type)
);

-- user_words (personal bank with spaced repetition - SM-2 algorithm)
create table user_words (
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

-- game sessions
create table game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  game_type text check (game_type in ('spell','sentence','synonym','quiz','flashcard')),
  score int,
  duration_seconds int,
  words_practiced uuid[],
  created_at timestamptz default now()
);

-- grammar lessons (content) + progress
create table grammar_lessons (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text,
  level text,
  category text,
  content jsonb,
  order_index int
);

create table lesson_progress (
  user_id uuid references profiles(id) on delete cascade,
  lesson_id uuid references grammar_lessons(id) on delete cascade,
  completed boolean default false,
  score int,
  completed_at timestamptz,
  primary key (user_id, lesson_id)
);

-- speaking recordings
create table speaking_recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  target_text text,
  audio_url text,
  accent text,
  accuracy_score numeric,
  created_at timestamptz default now()
);

-- AI conversation history
create table ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  scenario text,
  messages jsonb,
  created_at timestamptz default now()
);

-- Row Level Security (Supabase essential)
alter table profiles enable row level security;
alter table user_words enable row level security;
alter table game_sessions enable row level security;
alter table lesson_progress enable row level security;
alter table speaking_recordings enable row level security;
alter table ai_conversations enable row level security;

create policy "users see own profile" on profiles for all using (auth.uid() = id);
create policy "users own words" on user_words for all using (auth.uid() = user_id);
create policy "users own games" on game_sessions for all using (auth.uid() = user_id);
create policy "users own lessons" on lesson_progress for all using (auth.uid() = user_id);
create policy "users own recordings" on speaking_recordings for all using (auth.uid() = user_id);
create policy "users own chats" on ai_conversations for all using (auth.uid() = user_id);
create policy "anyone reads words" on words for select using (true);