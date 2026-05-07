## ADDED Requirements

### Requirement: Hard input caps for AI endpoints
AI endpoints SHALL reject inputs that exceed declared word count or character length, independently of daily quotas. These caps apply to ALL tiers including `author`.

#### Scenario: Chat prompt too long in words
- **WHEN** a user submits an `ai_chat` prompt with more than 20 words
- **THEN** the server SHALL respond with HTTP `400` and `{ "error": "invalid_body" }`

#### Scenario: Chat prompt too long in chars
- **WHEN** a user submits an `ai_chat` prompt longer than 150 characters
- **THEN** the server SHALL respond with HTTP `400` and `{ "error": "invalid_body" }`

#### Scenario: Writing feedback input too long
- **WHEN** a user submits writing feedback input exceeding 50 words OR 200 characters
- **THEN** the server SHALL respond with HTTP `400`

### Requirement: Caps enforced via Zod
Input caps SHALL be expressed in Zod schemas under `src/lib/schemas/ai.ts` so validation is centralized and reused by both API routes and any server actions.

#### Scenario: Schema reuse
- **WHEN** a new endpoint accepts the same input shape
- **THEN** it SHALL import the existing schema rather than re-declare caps

### Requirement: Client mirrors caps
Form components for capped inputs SHALL show a live counter (e.g., `"42 / 200"`) and prevent submission past the cap as a UX courtesy. The server remains the source of truth.

#### Scenario: User pastes overlong text
- **WHEN** a user pastes 300 chars into the writing feedback input
- **THEN** the form SHALL display the counter in an error color and disable the submit button

### Requirement: Speaking attempt duration cap
Speaking practice attempts SHALL be limited to 60 seconds of audio per attempt, enforced in both the recorder UI and any server-side validation if audio is uploaded.

#### Scenario: Recording exceeds limit
- **WHEN** a user has been recording for 60 seconds
- **THEN** the recorder SHALL automatically stop and submit
