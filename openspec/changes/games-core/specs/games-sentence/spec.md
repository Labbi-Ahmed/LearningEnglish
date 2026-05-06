## ADDED Requirements

### Requirement: Sentence game — reorder shuffled tokens

The system SHALL expose `/games/sentence` where, for each item, the page presents the example sentence from `words.example` with its tokens shuffled and asks the user to drag (or click in order) tokens into the original sequence. Comparison MUST normalize whitespace and ignore trailing punctuation.

#### Scenario: Correct order
- **WHEN** the user's token sequence matches the original example
- **THEN** the item is marked correct

#### Scenario: Word lacks example
- **WHEN** a saved word has `example IS NULL`
- **THEN** that word is excluded from the round (the batch endpoint filters it out before returning)

#### Scenario: Mobile-friendly input
- **WHEN** the user taps tokens in order on a touch device
- **THEN** taps assemble the sentence equivalently to drag-and-drop on desktop
