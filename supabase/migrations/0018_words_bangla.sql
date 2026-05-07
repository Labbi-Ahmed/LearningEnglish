-- 0018_words_bangla.sql
-- Adds Bangla language support to the shared words cache.
--
-- HOW TO RUN IN SUPABASE:
--   Run PART A first (adds the 3 columns).
--   Then enable pg_trgm: Dashboard → Database → Extensions → pg_trgm → Enable.
--   Then run PART B (creates the search index).
--
-- meaning_bn : Bangla translation of the English meaning.
-- example_bn : Bangla translation of the English usage example.
-- word_bn    : Bangla equivalent word (e.g. "আপেল" for "apple").
--              Used for future Bangla → English reverse search.
--
-- Depends on: 0002_words.sql

-- ── PART A ── run this in SQL editor ─────────────────────────────────────

alter table words add column if not exists meaning_bn text;
alter table words add column if not exists example_bn text;
alter table words add column if not exists word_bn    text;

-- Verify Part A:
--   select column_name from information_schema.columns
--   where table_name = 'words' and column_name like '%_bn%';
--   → should return 3 rows: meaning_bn, example_bn, word_bn

-- ── PART B ── run AFTER enabling pg_trgm from the Supabase dashboard ─────
-- (Dashboard → Database → Extensions → search "pg_trgm" → toggle Enable)
--
-- create index if not exists words_word_bn_trgm_idx
--   on words using gin (word_bn gin_trgm_ops);
