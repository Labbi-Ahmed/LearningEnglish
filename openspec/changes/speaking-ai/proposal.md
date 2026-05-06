## Why

Phase 6 of `Project-plan/fullPlane.md` — `feature/speaking-ai`. Two of the locked-in features are speaking practice (record + score against target text using the Web Speech API) and AI-powered conversation/writing-feedback via Gemini. Both depend on auth + saved-words context (Phases 1–4) and benefit from grammar lessons (Phase 5).

## What Changes

- Implement `lib/gemini.ts` — wrapper around the Gemini API: `generateChat(messages)`, `generateWritingFeedback(text)`, `generateSentenceRephrase(sentence, style)`. Centralizes the API key, retry/backoff, and prompt templates.
- Implement `POST /api/speaking/upload` — accepts an audio Blob, uploads to Supabase Storage `speaking/<user>/<id>.webm`, returns the public storage path.
- Implement `POST /api/speaking/score` — accepts `{ recording_id, target_text, transcript }` (transcript produced client-side via Web Speech API), computes word-level accuracy server-side, writes a row in `speaking_recordings` with the score.
- Implement `POST /api/ai/chat` — proxies a chat message to Gemini, persists the turn into `ai_conversations`, and returns the model reply.
- Implement `POST /api/ai/writing-feedback` — sends user-submitted text to Gemini with a corrections prompt; returns structured `{ corrected, issues: [{ excerpt, suggestion, category }] }`.
- Implement `POST /api/ai/sentence-rephrase` — takes a sentence + a style (`formal` / `casual` / `simple`) and returns three alternates.
- Build UIs:
  - `(dashboard)/speaking` — text prompts to read aloud, in-browser recording with `MediaRecorder`, Web Speech API transcription, score display per attempt, history list.
  - `(dashboard)/writing` — textarea + "Get feedback" + "Rephrase sentence" actions; renders structured feedback.
  - `(dashboard)/chat` — minimal chat UI bound to `/api/ai/chat`, persistent conversation per session.
- Add `lib/schemas/{speaking,ai}.ts` for body validation.
- Document Gemini quota handling: surface a friendly error if the request fails 429 or 5xx.

Out of scope: voice-to-voice realtime AI (v2 idea), multi-turn conversation memory beyond the active session, fine-grained pronunciation diagnostics (we use word-level alignment only).

## Capabilities

### New Capabilities

- `speaking-practice`: recording upload, transcript scoring, history.
- `ai-chat`: Gemini-backed conversational practice partner.
- `ai-writing-feedback`: Gemini-backed grammar correction and sentence rephrasing.

### Modified Capabilities

None.

## Impact

- **Code (new)**: `src/lib/gemini.ts`; `src/app/api/speaking/upload/route.ts`; `src/app/api/speaking/score/route.ts`; `src/app/api/ai/chat/route.ts`; `src/app/api/ai/writing-feedback/route.ts`; `src/app/api/ai/sentence-rephrase/route.ts`; `src/app/(dashboard)/speaking/page.tsx`; `src/app/(dashboard)/writing/page.tsx`; `src/app/(dashboard)/chat/page.tsx`; `src/components/speaking/{recorder.tsx,score-card.tsx}`; `src/components/ai/{feedback-view.tsx,chat-window.tsx}`; `src/lib/schemas/{speaking,ai}.ts`.
- **Code (modified)**: dashboard nav adds Speaking / Writing / Chat. `lib/env.ts` adds `GEMINI_API_KEY`.
- **Dependencies**: `@google/generative-ai`. No other paid services.
- **Database**: no schema changes. Uses existing `speaking_recordings` and `ai_conversations` tables. Storage bucket `speaking` must exist (one-time setup task).
- **Free-tier risk**: Gemini quota is generous but bounded. Mitigations: cache rephrase results by `(sentence, style)`; rate-limit per user; show a clear "AI is busy, try again in a minute" message on 429.
- **Downstream**: Phase 7 stats include AI usage and speaking accuracy averages.
