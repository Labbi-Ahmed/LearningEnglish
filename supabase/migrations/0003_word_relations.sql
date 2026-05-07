-- 0003_word_relations.sql
-- Phase 2 (vocabulary). Synonyms / antonyms per word. Public read-only.
-- Depends on: 0002_words.sql

create table if not exists word_relations (
  word_id uuid references words(id) on delete cascade,
  related_text text,
  relation_type text check (relation_type in ('synonym','antonym')),
  primary key (word_id, related_text, relation_type)
);

alter table word_relations enable row level security;

drop policy if exists "anyone reads word_relations" on word_relations;
create policy "anyone reads word_relations" on word_relations
  for select using (true);

-- Verify: select count(*) from word_relations;
