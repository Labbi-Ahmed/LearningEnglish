## ADDED Requirements

### Requirement: Spell game — type the word from audio

The system SHALL expose `/games/spell` where, for each item, the page plays the word via browser TTS (using the user's preferred accent from `profiles.preferred_accent`, defaulting to UK), shows only the meaning (no spelling hint), and accepts a typed answer. Comparison MUST be case-insensitive and trim whitespace.

#### Scenario: Correct answer
- **WHEN** the typed answer equals the word (case-insensitive)
- **THEN** the item is marked correct and the next item loads

#### Scenario: Replay audio
- **WHEN** the user clicks the "Play again" button
- **THEN** TTS replays the same word; replays do not affect scoring

#### Scenario: Submit empty
- **WHEN** the user submits an empty input
- **THEN** the item is marked incorrect and the next item loads
