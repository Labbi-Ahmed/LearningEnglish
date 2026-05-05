## MODIFIED Requirements

### Requirement: Stats dashboard endpoint

The system SHALL expose `GET /api/progress/dashboard` returning aggregated stats for the authenticated user. Response shape:

```
{
  level: 'a1'..'c2',
  words: { saved: int, mastered: int, due_today: int },
  games: { spell: { plays, avg_score }, sentence: {...}, synonym: {...}, quiz: {...} },
  grammar: { lessons_completed: int, total_lessons: int },
  speaking: { attempts: int, avg_accuracy: int | null },
  ai: { conversations: int },
  streak: { current_days: int },        // now real, computed from user_xp_events
  xp: { total: int, this_week: int },   // new
  badges: [{ key: string, earned_at: timestamptz }]   // new
}
```

`streak.current_days` MUST be the value of `profiles.streak` (kept up-to-date by the XP grant helper). `xp.total` MUST equal `profiles.xp`. `xp.this_week` MUST be the sum of `user_xp_events.amount` in the trailing 7 days. `badges` MUST list the user's `user_badges` rows.

#### Scenario: Real streak
- **WHEN** a user has earned XP on each of the last 3 days
- **THEN** `streak.current_days = 3`

#### Scenario: New user
- **WHEN** a freshly signed-up user with no activity GETs the endpoint
- **THEN** `xp.total = 0`, `xp.this_week = 0`, `badges = []`, `streak.current_days = 0`

#### Scenario: Mixed activity
- **WHEN** the user has 50 saved words, 12 of which have `repetitions >= 4`
- **THEN** `words.saved = 50` and `words.mastered = 12`

#### Scenario: Unauthenticated
- **WHEN** no session is present
- **THEN** the endpoint returns `401`
