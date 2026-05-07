## ADDED Requirements

### Requirement: Badge unlock rules

The system SHALL evaluate badge unlock rules after each XP grant and insert a `user_badges` row when a rule fires. Initial badges:
- `first_word`: first row in `user_words`.
- `ten_words`: 10 rows in `user_words`.
- `first_review`: first review-source XP event.
- `seven_day_streak`: `profiles.streak >= 7`.
- `first_lesson`: first `lesson_progress` row with `completed_at IS NOT NULL`.
- `first_speaking`: first row in `speaking_recordings`.

Each badge MUST be unlockable at most once per user (unique `(user_id, badge_key)`).

#### Scenario: First word unlocks badge
- **WHEN** a user saves their first word
- **THEN** the post-save XP grant evaluates rules and inserts `user_badges(user_id, badge_key='first_word')`

#### Scenario: Idempotent unlocks
- **WHEN** rule evaluation runs again after the badge already exists
- **THEN** no duplicate row is inserted (unique-conflict ignored)

### Requirement: Badge UI

The system SHALL render a badge grid on the dashboard with each badge shown as locked (silhouette) or unlocked (illustrated + earned-on date).

#### Scenario: Mixed states
- **WHEN** the user has `first_word` and `first_review` but not `seven_day_streak`
- **THEN** the grid shows two unlocked and the rest locked
