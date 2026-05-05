## Context

First phase that talks to a paid-quota external service (Gemini, free tier). Also first to write to Supabase Storage. Two distinct surface areas (speaking, AI text) sharing a single phase because both depend on the same Gemini wrapper and the user wants them shipped together.

## Goals

- One Gemini wrapper, used by all three AI endpoints.
- Five independently apply-able fetches (speaking-upload, speaking-score, ai-chat, writing-feedback, sentence-rephrase).
- Friendly degradation when Gemini quota is hit.

## Non-Goals

- Streaming responses from Gemini in MVP — wait for the full reply.
- Server-side STT — we use the browser's Web Speech API client-side and send the transcript to the server.
- Pronunciation diagnostics beyond word-level accuracy.

## Decisions

### Decision: Word-level Levenshtein scoring, not phoneme-level

Phoneme alignment requires either a paid service or a heavy WASM model. Word-level accuracy is honest and shippable. We document the limitation in the UI.

### Decision: Sentence-rephrase cache via a small Postgres table or KV

Add a `ai_cache` table or piggyback on an existing one. Decide in tasks group 1 — recommend a new tiny table `ai_rephrase_cache (sentence_hash text primary key, style text, alternates jsonb, created_at timestamptz)` with a 24h-old purge; new migration `004_ai_rephrase_cache.sql`.

### Decision: Rate-limit per-user on AI endpoints

Naive token bucket in memory is insufficient on serverless; instead, count rows in `ai_conversations` / `ai_rephrase_cache` over the last hour and reject when above a threshold. Cheap and good enough for MVP.

### Decision: Browser limitations are surfaced honestly

Web Speech API works only in Chromium-family browsers. We do not polyfill — we show a clear "use Chrome" message rather than degrade silently.

## Risks / Trade-offs

- **Gemini schema drift**: Google updates the API. Mitigation — pin the SDK version; abstract behind `lib/gemini.ts`; fail closed with `ai_unavailable` rather than crashing.
- **Storage costs**: 1 GB free tier supports thousands of short clips. Mitigation — per-recording 2 MB cap and a future TTL/cleanup job (deferred).
- **Audio mime variance**: Safari yields `audio/mp4`, Chrome `audio/webm`. Allow both; reject anything else.

## Migration Plan

Optional `004_ai_rephrase_cache.sql` — small additive table. Storage bucket `speaking` must be created with RLS policies allowing the owning user to read/write within their folder; document the SQL/dashboard steps in task 1.x.
