## ADDED Requirements

### Requirement: EN / বাং language toggle on WordCard

The system SHALL render an **EN / বাং** toggle on the vocabulary WordCard when `meaning_bn` is not null. The toggle SHALL switch the displayed meaning, example sentence, synonyms list, and antonyms list simultaneously between English and Bangla. English SHALL be the default language. The toggle SHALL be hidden entirely when `meaning_bn` is null — no placeholder or disabled state.

#### Scenario: Bangla data available — default view
- **WHEN** a user looks up a word that has `meaning_bn` populated
- **THEN** the WordCard renders an EN / বাং toggle above the meaning
- **AND** the EN tab is active by default
- **AND** the English meaning, example, synonyms, and antonyms are displayed

#### Scenario: Switch to Bangla
- **WHEN** the user clicks the বাং tab on a WordCard with Bangla data
- **THEN** the meaning section shows `meaning_bn` labelled "অর্থ"
- **AND** the example section shows `example_bn` (if non-null)
- **AND** the synonyms section shows `synonyms_bn` (up to 8)
- **AND** the antonyms section shows `antonyms_bn` (up to 8)

#### Scenario: Switch back to English
- **WHEN** the user clicks the EN tab after viewing Bangla
- **THEN** the WordCard reverts to showing all English fields

#### Scenario: No Bangla data (pre-migration cached word)
- **WHEN** a word is displayed with `meaning_bn: null`
- **THEN** no EN / বাং toggle is rendered
- **AND** the English meaning is shown as normal
- **AND** no error or placeholder message is shown

#### Scenario: Partial Bangla data — example missing
- **WHEN** `meaning_bn` is not null but `example_bn` is null
- **THEN** the toggle is shown (meaning_bn drives visibility)
- **AND** in Bangla mode, the example section is hidden (same as English mode when `example` is null)

### Requirement: API route exposes Bangla fields

The system SHALL include `meaning_bn`, `example_bn`, `synonyms_bn`, and `antonyms_bn` in the `GET /api/words/[word]` response. `synonyms_bn` and `antonyms_bn` SHALL be arrays (empty array when no bn data, never null).

#### Scenario: Word with full Bangla data
- **WHEN** the API route returns a word where bn fields are all populated
- **THEN** the JSON includes non-null `meaning_bn`, `example_bn`, non-empty `synonyms_bn`, non-empty `antonyms_bn`

#### Scenario: Word with no Bangla data
- **WHEN** the API route returns a word where `meaning_bn IS NULL`
- **THEN** the JSON includes `meaning_bn: null`, `example_bn: null`, `synonyms_bn: []`, `antonyms_bn: []`
