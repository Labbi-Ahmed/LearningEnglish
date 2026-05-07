# Phase 6 — Speaking & AI

## Status: Implementation complete (manual smoke + Vercel preview pending)

## What was built

### Gemini wrapper
`src/lib/gemini.ts` — single entry point for all AI calls: `generateChat`, `generateWritingFeedback`, `generateSentenceRephrase`. Maps upstream errors to typed `AIQuotaError` / `AIUnavailableError` / `AIParseError`. All three features return structured JSON and are validated with Zod.

### Routes added

| Route | Method | Purpose |
|---|---|---|
| `/api/speaking/upload` | POST | Upload audio (multipart, ≤ 2 MB, audio/*), store in Supabase Storage `speaking/<user_id>/<uuid>.webm`, return `{ recording_id, storage_path }` |
| `/api/speaking/score` | POST | Accept `{ recording_id, target_text, transcript }`, compute word-level accuracy, persist to `speaking_recordings` |
| `/api/ai/chat` | POST | Resolve/create `ai_conversations`, forward to Gemini, persist turns, return reply |
| `/api/ai/writing-feedback` | POST | Send text to Gemini, validate structured JSON response, return `{ corrected, issues[] }` |
| `/api/ai/sentence-rephrase` | POST | Cache-first rephrase via `ai_rephrase_cache`; call Gemini on miss; return 3 alternates |

### Pages

| Path | Description |
|---|---|
| `/speaking` | Prompt list, MediaRecorder + Web Speech API, score card, history |
| `/chat` | Full-page chat UI; optimistic user turn; 503 error state |
| `/writing` | Textarea, Get Feedback, Rephrase Sentence (text-selection aware), apply buttons |

### Nav
Dashboard layout now includes Speaking / Writing / Chat links.

### Decisions

- **No server-side STT** — browser Web Speech API; transcript sent to server as plain text.
- **Word-level Levenshtein-free accuracy** — case-insensitive, punctuation-stripped word set match.
- **Rephrase cache** — SHA-256 hash of `(sentence, style)` in `ai_rephrase_cache`; 24 h TTL.
- **Safari/Firefox warning** — graceful fallback when `SpeechRecognition` is absent, record button disabled.
- **Gemini 503 handling** — both chat and writing surfaces show "AI is busy, try again in a minute" without crashing.

## Manual verification

### Speaking
1. Open `/speaking`, click **Start recording**, read the prompt aloud, click **Stop & score**.
2. Score card appears. History list shows the attempt after page refresh.
3. On Safari: "Live transcription unavailable in this browser — try Chrome" message appears.

### Chat
1. Open `/chat`, type "Hello!", hit Enter → reply arrives within ~5 seconds.
2. Continue conversation → prior turns sent to Gemini.
3. Reload page — start a new conversation (no persistence across page reloads by design; convId in memory only).

### Writing feedback
1. Open `/writing`, paste a paragraph with a grammar error, click **Get feedback**.
2. Corrected text and issues panel appear. Click **Apply** → text updates in-place.

### Sentence rephrase
1. Select a sentence in the textarea, click **Rephrase sentence**, pick a style, click **Rephrase**.
2. Three alternates appear. Click **Use** → sentence replaced in textarea.
3. Repeat same sentence + style → check server logs for cache hit (no Gemini request).

## Infrastructure setup (one-time, done in Supabase dashboard)

1. Storage → New bucket → name: `speaking`, private.
2. Storage → Policies → add policy for `speaking` bucket: `auth.uid()::text = (storage.foldername(name))[1]` for INSERT + SELECT.
3. Apply migration `0016_speaking_recordings_transcript.sql` via dashboard SQL editor.

## What this unblocks

Phase 7 stats can aggregate `accuracy_score` averages and AI usage counts from `speaking_recordings` and `ai_conversations`.
