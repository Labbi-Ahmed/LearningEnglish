## ADDED Requirements

### Requirement: Placement test endpoint

The system SHALL expose `POST /api/profile/placement` accepting `{ answers: [{ question_id: string, answer: string }] }`. The endpoint MUST score answers against a static question bank in `lib/placement/questions.ts`, derive a CEFR level (`a1`..`c2`) by score band, write `profiles.level`, and return `{ level, score, total, band: 'a1'|'a2'|'b1'|'b2'|'c1'|'c2' }`.

#### Scenario: First-time placement
- **WHEN** an authenticated user with default `level='a1'` submits 12 answers totaling 9 correct
- **THEN** their `profiles.level` is updated based on the band that 9/12 falls into
- **AND** the response contains the new level

#### Scenario: Retake
- **WHEN** the user submits a new placement after a prior one
- **THEN** `profiles.level` is overwritten with the new result (no level "lock")

#### Scenario: Invalid question id
- **WHEN** any `question_id` is not in the bank
- **THEN** the endpoint returns `400 { error: "unknown_question" }` and `profiles.level` is unchanged

#### Scenario: Unauthenticated
- **WHEN** no session is present
- **THEN** the endpoint returns `401`

### Requirement: Placement UI

The system SHALL expose `(dashboard)/placement` walking the user through 12–15 questions spanning vocabulary, grammar, and listening (TTS prompt). On submit, the page POSTs answers and shows the result with a "Continue to dashboard" link. The placement page SHALL be reachable from a "Take the placement test" CTA on the dashboard for users whose `profiles.level` is still the default (`a1`) and who have no prior placement.

#### Scenario: Skip option
- **WHEN** the user clicks "Skip for now"
- **THEN** the page redirects to the dashboard without writing `profiles.level`

#### Scenario: Listening question on unsupported browser
- **WHEN** TTS is unavailable
- **THEN** the question is replaced with a text-only fallback so the test still completes
