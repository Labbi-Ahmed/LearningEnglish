-- 0002_words.sql
-- Phase 2 (vocabulary). Shared dictionary cache. Public read-only.
-- Writes are restricted to the service role (no insert/update/delete policy).

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

alter table words enable row level security;

drop policy if exists "anyone reads words" on words;
create policy "anyone reads words" on words
  for select using (true);

-- Verify: select count(*) from words;
