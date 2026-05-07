## ADDED Requirements

### Requirement: Progress submission endpoint

The system SHALL expose `POST /api/grammar/progress` accepting `{ lesson_id: uuid, score: int, completed: boolean }`. The endpoint MUST upsert one `lesson_progress` row per `(user_id, lesson_id)`. When `completed = true`, the row's `completed_at` MUST be set to `now()`. Re-submitting for the same lesson MUST keep the highest `score` and MUST NOT clear `completed_at` once set.

#### Scenario: First completion
- **WHEN** the user POSTs `{ lesson_id, score: 8, completed: true }`
- **THEN** a `lesson_progress` row is inserted with `score=8` and `completed_at=now()`

#### Scenario: Re-attempt with higher score
- **WHEN** the user later POSTs the same lesson with `score: 10`
- **THEN** the row's `score` becomes 10; `completed_at` is unchanged

#### Scenario: Re-attempt with lower score
- **WHEN** the user POSTs `score: 5` for an already-completed lesson
- **THEN** the row's `score` stays at the previous higher value

#### Scenario: Unauthenticated
- **WHEN** no session is present
- **THEN** the endpoint returns `401`
