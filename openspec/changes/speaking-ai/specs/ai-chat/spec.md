## ADDED Requirements

### Requirement: Chat endpoint

The system SHALL expose `POST /api/ai/chat` accepting `{ conversation_id?: uuid, message: string }`. The endpoint MUST resolve or create the `ai_conversations` row, append the user turn, send the running messages to Gemini via `lib/gemini.ts`, append the assistant reply, and return `{ conversation_id, reply: string }`. Conversation history MUST be RLS-scoped.

#### Scenario: New conversation
- **WHEN** the user POSTs without `conversation_id`
- **THEN** a new `ai_conversations` row is created and the `conversation_id` is returned

#### Scenario: Continue existing conversation
- **WHEN** the user POSTs with a valid `conversation_id`
- **THEN** Gemini receives the prior turns and the reply continues the thread

#### Scenario: Gemini quota exhausted
- **WHEN** the upstream returns 429 or repeated 5xx
- **THEN** the endpoint returns `503 { error: "ai_unavailable" }` and no turn is persisted

#### Scenario: Unauthenticated
- **WHEN** no session is present
- **THEN** the endpoint returns `401`

### Requirement: Chat UI

The system SHALL expose `(dashboard)/chat` with a message list rendering both turns, an input box, send button, optimistic append of the user turn, and a graceful error state when the endpoint returns `503`.

#### Scenario: Send message
- **WHEN** the user submits a message
- **THEN** their message appears immediately, the assistant reply streams or appears within ~5 seconds, and the conversation persists across reloads
