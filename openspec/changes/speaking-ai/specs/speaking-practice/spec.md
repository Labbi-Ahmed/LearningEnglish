## ADDED Requirements

### Requirement: Audio upload endpoint

The system SHALL expose `POST /api/speaking/upload` accepting a `multipart/form-data` body with one audio file (≤ 2 MB, `audio/webm` or `audio/mp4`). The endpoint MUST upload to the `speaking` Supabase Storage bucket at `<user_id>/<uuid>.<ext>` using the user-session client (RLS-scoped). Response: `{ recording_id: uuid, storage_path: string }`.

#### Scenario: Valid upload
- **WHEN** an authenticated user POSTs a 1 MB `audio/webm` blob
- **THEN** the file is uploaded under their user folder and the response contains the recording id

#### Scenario: Oversized file
- **WHEN** the file exceeds 2 MB
- **THEN** the endpoint returns `413 { error: "file_too_large" }`

#### Scenario: Wrong mime type
- **WHEN** the file's content type is not `audio/*`
- **THEN** the endpoint returns `415`

#### Scenario: Unauthenticated
- **WHEN** no session is present
- **THEN** the endpoint returns `401`

### Requirement: Speaking score endpoint

The system SHALL expose `POST /api/speaking/score` accepting `{ recording_id: uuid, target_text: string, transcript: string }`. The endpoint MUST compute word-level accuracy (case-insensitive, punctuation-stripped Levenshtein-aligned word match) and persist a row in `speaking_recordings` with `accuracy_score` (0–100), `target_text`, `transcript`, and the storage path. Response: the persisted row.

#### Scenario: High accuracy
- **WHEN** transcript matches target text exactly
- **THEN** `accuracy_score = 100` and the row is written

#### Scenario: Word-level partial match
- **WHEN** the transcript is missing one of ten target words
- **THEN** `accuracy_score = 90`

#### Scenario: Recording not owned by caller
- **WHEN** the `recording_id` references a row belonging to a different user
- **THEN** the endpoint returns `404` (RLS denies the join)

### Requirement: Speaking practice UI

The system SHALL expose `(dashboard)/speaking` with: a list of curated prompts (or a free-form input), a record button using `MediaRecorder`, a live transcript via `webkitSpeechRecognition` / `SpeechRecognition`, an upload+score flow on stop, a per-attempt score card, and a history list of past recordings ordered by `created_at desc`.

#### Scenario: Browser lacks Speech Recognition
- **WHEN** `SpeechRecognition` is undefined (Safari / Firefox)
- **THEN** the page shows "Live transcription unavailable in this browser — try Chrome" and disables the record button gracefully

#### Scenario: Score history
- **WHEN** the user has 3 prior `speaking_recordings` rows
- **THEN** the history list shows them with target text and score
