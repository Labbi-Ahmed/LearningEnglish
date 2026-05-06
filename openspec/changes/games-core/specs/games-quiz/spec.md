## ADDED Requirements

### Requirement: Quiz game — meaning multiple choice

The system SHALL expose `/games/quiz` where, for each item, the page shows the saved word and four candidate meanings (one true meaning from `words.meaning` plus three distractors drawn from other words in the user's bank or the shared `words` table). The user picks one.

#### Scenario: Correct pick
- **WHEN** the user picks the option whose source is the same `word_id` as the prompt
- **THEN** the item is marked correct

#### Scenario: Distractor uniqueness
- **WHEN** the batch endpoint assembles distractors
- **THEN** no two options on the same item share a `word_id`

#### Scenario: Word lacks meaning
- **WHEN** a saved word has `meaning IS NULL`
- **THEN** the batch endpoint excludes it from the round
