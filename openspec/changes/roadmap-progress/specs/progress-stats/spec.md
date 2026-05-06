## ADDED Requirements

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
  streak: { current_days: int }   // placeholder until Phase 8
}
```

`mastered` MUST mean `user_words.repetitions >= 4`. `due_today` MUST count rows with `next_review_at <= now()`.

#### Scenario: New user
- **WHEN** a freshly signed-up user with no activity GETs the endpoint
- **THEN** all numeric counts are 0 and `avg_accuracy` is null

#### Scenario: Mixed activity
- **WHEN** the user has 50 saved words, 12 of which have `repetitions >= 4`
- **THEN** `words.saved = 50` and `words.mastered = 12`

#### Scenario: Unauthenticated
- **WHEN** no session is present
- **THEN** the endpoint returns `401`

### Requirement: Dashboard home UI

The system SHALL render `(dashboard)/dashboard` with: greeting + email, level chip, due-today badge, stats panels for words / games / grammar / speaking / AI (charts via Recharts), and a "Recommended next" card.

#### Scenario: Recommendation logic
- **WHEN** the user has no placement and `profiles.level` is the default
- **THEN** the recommended card prompts "Take the 5-minute placement test"
- **WHEN** placement is done but the user has zero saved words
- **THEN** it prompts "Look up and save your first word"
- **WHEN** at least one word is due today
- **THEN** it prompts "Review N words" linking to `/review`
- **WHEN** all of the above are satisfied
- **THEN** it suggests the next un-completed grammar lesson at the user's level

### Requirement: Roadmap UI

The system SHALL render `(dashboard)/roadmap` showing five steps (Vocabulary, Games, Grammar, Speaking, AI Practice) each marked complete / in-progress / locked based on the stats endpoint. The view is read-only and links each step to the relevant dashboard page.

#### Scenario: Step completion thresholds
- **WHEN** the stats show `words.saved >= 10`
- **THEN** the Vocabulary step is marked complete
- **WHEN** any single game has `plays >= 1`
- **THEN** the Games step is marked in-progress; complete at `plays >= 5` for any game
