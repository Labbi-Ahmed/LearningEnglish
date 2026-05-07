-- 0019_word_relations_bn.sql
-- Adds Bangla translation column to word_relations for synonym/antonym Bangla display.
-- Depends on: 0003_word_relations.sql, 0018_words_bangla.sql

alter table word_relations add column if not exists related_text_bn text;

-- Verify:
--   select column_name from information_schema.columns
--   where table_name in ('words','word_relations') and column_name like '%_bn%';
--   -- should return: meaning_bn, example_bn, word_bn, related_text_bn (4 rows)
