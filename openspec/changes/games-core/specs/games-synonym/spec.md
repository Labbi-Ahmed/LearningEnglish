## ADDED Requirements

### Requirement: Synonym game — pick the matching word

The system SHALL expose `/games/synonym` where, for each item, the page shows a saved word and four candidate words (one true synonym from `word_relations` plus three distractors). The user picks one. Distractors MUST come from the user's other saved words first, falling back to random rows from the shared `words` table when fewer than three other saved words exist.

#### Scenario: Correct pick
- **WHEN** the user picks the word listed in `word_relations` with `relation_type = 'synonym'`
- **THEN** the item is marked correct

#### Scenario: Word lacks synonyms
- **WHEN** a saved word has zero `word_relations` rows of type `synonym`
- **THEN** the batch endpoint excludes it from the round

#### Scenario: Antonym variant
- **WHEN** the round is configured (via `?mode=antonym`) to test antonyms
- **THEN** the endpoint returns items whose correct answer comes from `relation_type = 'antonym'`
