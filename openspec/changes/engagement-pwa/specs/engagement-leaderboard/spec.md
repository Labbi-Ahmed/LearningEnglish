## ADDED Requirements

### Requirement: Weekly leaderboard endpoint

The system SHALL expose `GET /api/leaderboard/weekly?limit=<n>` returning top-N users by XP earned in the trailing 7 days. Each row MUST contain only `display_name` (or a redacted "Learner #<short-hash>" if no display name), `level`, and `weekly_xp`. `limit` defaults to 20, max 100.

#### Scenario: Top 20
- **WHEN** an authenticated user GETs the endpoint
- **THEN** the response contains up to 20 rows ordered by `weekly_xp` desc

#### Scenario: Privacy
- **WHEN** a user has not set a display name
- **THEN** their entry uses a stable but anonymized handle and never leaks email or `user_id`

#### Scenario: Unauthenticated
- **WHEN** no session is present
- **THEN** the endpoint returns `401`

### Requirement: Leaderboard UI

The system SHALL expose `(dashboard)/leaderboard` rendering the weekly board with the caller's row highlighted if present.

#### Scenario: Self-highlight
- **WHEN** the caller is in the top 20
- **THEN** their row is visually highlighted
