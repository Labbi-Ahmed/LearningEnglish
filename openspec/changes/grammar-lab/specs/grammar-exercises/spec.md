## ADDED Requirements

### Requirement: Exercise types and runtime

The system SHALL support three exercise types stored in each lesson's `exercises` JSONB array:
- `fill_in_blank`: `{ type, prompt: string with "___", answer: string | string[] }` (multiple acceptable answers).
- `multiple_choice`: `{ type, prompt, options: string[], correct_index: int }`.
- `reorder`: `{ type, prompt: string[] (correct order), shuffled: string[] }`.

The runtime in `lib/grammar/exercises.ts` SHALL score each item: case-insensitive trim for fill-in-blank, exact index for multiple-choice, exact array equality for reorder.

#### Scenario: Fill-in-blank with multiple answers
- **WHEN** an item's `answer` is `["went", "was going"]` and the user types `Went`
- **THEN** the item is marked correct

#### Scenario: Reorder mismatch
- **WHEN** the user submits a sequence that differs from the canonical order
- **THEN** the item is marked incorrect

### Requirement: Lesson page UI

The dashboard SHALL render `(dashboard)/grammar/[slug]` showing the lesson body (markdown) and an exercise runner. On submit, the runner MUST compute total/score, POST to `/api/grammar/progress`, and show a finish summary with per-item correctness.

#### Scenario: Submit completes lesson
- **WHEN** the user finishes all exercises with score ≥ 70%
- **THEN** the runner POSTs `{ completed: true }` and the finish summary shows a "Lesson complete" badge

#### Scenario: Submit below threshold
- **WHEN** the score is < 70%
- **THEN** the runner POSTs `{ completed: false }` and offers a retry button
