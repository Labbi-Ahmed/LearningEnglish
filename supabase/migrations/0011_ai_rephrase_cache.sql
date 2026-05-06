-- 0011_ai_rephrase_cache.sql
-- Phase 6 (speaking-ai). Tiny cache for AI sentence-rephrase results so
-- repeated requests for the same sentence+style do not re-hit the Gemini API.
-- Public read OK (no PII); writes via service role only.

create table if not exists ai_rephrase_cache (
  sentence_hash text primary key,
  style text,
  alternates jsonb,
  created_at timestamptz default now()
);

alter table ai_rephrase_cache enable row level security;

drop policy if exists "anyone reads ai_rephrase_cache" on ai_rephrase_cache;
create policy "anyone reads ai_rephrase_cache" on ai_rephrase_cache
  for select using (true);

-- Verify: select count(*) from ai_rephrase_cache;
