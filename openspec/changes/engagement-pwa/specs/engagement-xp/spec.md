## ADDED Requirements

### Requirement: XP grants are ledgered

The system SHALL append one row to `user_xp_events` for every XP-earning action with `(user_id, source, amount, ref_id, created_at)`. `profiles.xp` MUST equal the sum of the user's events. Sources MUST be one of `'review'|'game'|'lesson'|'speaking'|'chat'|'streak_bonus'`.

#### Scenario: Granular grant
- **WHEN** the user finishes a quiz round with score 7/10
- **THEN** one event is inserted with `source='game'` and an amount per the rules table; `profiles.xp` increases by that amount

#### Scenario: Idempotent per ref_id
- **WHEN** the same `(source, ref_id)` is granted twice (e.g., a retried request)
- **THEN** only the first call inserts; the second is a no-op

### Requirement: Streak computation

The system SHALL define `streak.current_days` as the count of consecutive UTC days ending today during which the user has at least one `user_xp_events` row. When a grant is made, the helper MUST recompute the streak and update `profiles.streak`.

#### Scenario: Continued streak
- **WHEN** the user earned XP yesterday and earns XP today
- **THEN** `profiles.streak` increments by 1 (relative to yesterday's value)

#### Scenario: Broken streak
- **WHEN** the user has no event yesterday but earns one today
- **THEN** `profiles.streak` resets to 1

#### Scenario: Same-day double activity
- **WHEN** the user earns two XP grants on the same UTC day
- **THEN** `profiles.streak` increments at most once that day
