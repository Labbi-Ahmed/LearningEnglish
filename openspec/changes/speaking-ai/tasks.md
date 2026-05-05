> Apply groups in order. Groups 3, 4, 5, 6, 7 each isolate one fetch (upload, score, chat, writing-feedback, sentence-rephrase). Run lint + typecheck after every group.

## 1. External-service + storage prep

- [ ] 1.1 Create the `speaking` Supabase Storage bucket. Add RLS policies so each user can read/write only `<user_id>/*` paths.
- [ ] 1.2 Add `GEMINI_API_KEY` to `.env.local.example` and require it in `lib/env.ts`. Provision a key in the Gemini console.
- [ ] 1.3 (Optional) Create `supabase/migrations/004_ai_rephrase_cache.sql` for the cache table; apply via dashboard.

## 2. Wrappers + schemas

- [ ] 2.1 Install `@google/generative-ai`.
- [ ] 2.2 Create `src/lib/gemini.ts` with `generateChat(messages)`, `generateWritingFeedback(text)`, `generateSentenceRephrase(sentence, style)`. Map upstream errors to typed errors (`AIQuotaError`, `AIUnavailableError`, `AIParseError`). Centralize prompts.
- [ ] 2.3 Create `src/lib/schemas/speaking.ts` and `src/lib/schemas/ai.ts`.
- [ ] 2.4 Add nav links: Speaking, Writing, Chat.

## 3. FETCH #1 — `POST /api/speaking/upload`

- [ ] 3.1 Create `src/app/api/speaking/upload/route.ts`. Parse `multipart/form-data`. Enforce 2 MB and `audio/*` checks. Return `401`/`413`/`415` per spec.
- [ ] 3.2 Upload via the user-session client to `speaking/<user_id>/<uuid>.<ext>`. Insert a stub row in `speaking_recordings` with the storage path. Return `{ recording_id, storage_path }`.
- [ ] 3.3 Manual smoke: POST a small webm via curl with a session cookie; row appears.

## 4. FETCH #2 — `POST /api/speaking/score`

- [ ] 4.1 Create `src/app/api/speaking/score/route.ts`. Validate body. Look up the recording (RLS); compute word-level accuracy; update the row with `accuracy_score`, `target_text`, `transcript`.
- [ ] 4.2 Build `(dashboard)/speaking/page.tsx` + `recorder.tsx` with `MediaRecorder` + Web Speech API. On stop: upload via fetch #1, then call score with the live transcript.
- [ ] 4.3 Render a score card and a history list (read directly via Supabase from the page server component).
- [ ] 4.4 Manual smoke: read a prompt aloud → score appears within a few seconds.

## 5. FETCH #3 — `POST /api/ai/chat`

- [ ] 5.1 Create `src/app/api/ai/chat/route.ts`. Resolve/create `ai_conversations`, send turns to `generateChat`, persist user + assistant turns, return `{ conversation_id, reply }`.
- [ ] 5.2 Build `(dashboard)/chat/page.tsx` + `chat-window.tsx`: list of turns, input, send.
- [ ] 5.3 Handle `AIQuotaError` → render "AI is busy, try again in a minute" without persisting the turn.
- [ ] 5.4 Manual smoke: send "Hello!" → reply within ~5s; reload page → conversation persists.

## 6. FETCH #4 — `POST /api/ai/writing-feedback`

- [ ] 6.1 Create `src/app/api/ai/writing-feedback/route.ts`. Validate text length 1..2000.
- [ ] 6.2 Call `generateWritingFeedback`. Validate the structured response with Zod; return `{ corrected, issues[] }`.
- [ ] 6.3 Build `(dashboard)/writing/page.tsx` with textarea + "Get feedback" button + `<FeedbackView>` rendering issues with apply buttons.
- [ ] 6.4 Manual smoke: paste a paragraph with errors → see structured corrections.

## 7. FETCH #5 — `POST /api/ai/sentence-rephrase`

- [ ] 7.1 Create `src/app/api/ai/sentence-rephrase/route.ts`. Validate body. Hash `(sentence, style)`; check cache; on miss call Gemini and persist.
- [ ] 7.2 Add a "Rephrase sentence" button to the writing page that uses the user's text-selection.
- [ ] 7.3 Manual smoke: rephrase the same sentence twice → second call hits cache (no upstream request, observable in logs).

## 8. Definition-of-done

- [ ] 8.1 Lint / typecheck / test pass.
- [ ] 8.2 Manual: end-to-end speaking flow + chat + feedback + rephrase.
- [ ] 8.3 Vercel preview works with the production Gemini key.
- [ ] 8.4 Update `docs/PHASE_6_SPEAKING_AI.md`.
