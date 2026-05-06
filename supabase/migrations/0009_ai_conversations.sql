-- 0009_ai_conversations.sql
-- Phase 6 (speaking-ai). AI tutor chat history per user.
-- Depends on: 0001_profiles.sql

create table if not exists ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  scenario text,
  messages jsonb,
  created_at timestamptz default now()
);

alter table ai_conversations enable row level security;

drop policy if exists "users own chats" on ai_conversations;
create policy "users own chats" on ai_conversations
  for all using (auth.uid() = user_id);

-- Verify: select count(*) from ai_conversations;
