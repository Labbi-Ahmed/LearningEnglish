## ADDED Requirements

### Requirement: Writing feedback endpoint

The system SHALL expose `POST /api/ai/writing-feedback` accepting `{ text: string }` (1–2000 chars). The endpoint MUST send the text to Gemini with a structured-output prompt and return `{ corrected: string, issues: [{ excerpt: string, suggestion: string, category: 'grammar'|'spelling'|'style'|'clarity' }] }`.

#### Scenario: Valid text
- **WHEN** the user submits a 200-character paragraph with grammar errors
- **THEN** the response contains a corrected version and at least one issue with category and suggestion

#### Scenario: Empty text
- **WHEN** `text` is empty or whitespace
- **THEN** the endpoint returns `400 { error: "empty_text" }`

#### Scenario: Length cap
- **WHEN** `text` exceeds 2000 characters
- **THEN** the endpoint returns `413`

### Requirement: Sentence rephrase endpoint

The system SHALL expose `POST /api/ai/sentence-rephrase` accepting `{ sentence: string, style: 'formal'|'casual'|'simple' }`. Response: `{ alternates: string[3] }`. The endpoint MAY cache responses by `(sentence, style)` to conserve quota.

#### Scenario: Valid request
- **WHEN** the user POSTs a sentence with `style: 'formal'`
- **THEN** the response contains exactly three alternate phrasings

#### Scenario: Cache hit
- **WHEN** the same `(sentence, style)` was requested within the past 24 hours
- **THEN** the endpoint MAY return the cached response without calling Gemini

### Requirement: Writing UI

The system SHALL expose `(dashboard)/writing` with: a textarea, "Get feedback" button, "Rephrase sentence" button (disabled unless a single sentence is selected), and a feedback panel showing the corrected text plus categorized issues.

#### Scenario: Apply correction
- **WHEN** the user clicks an issue's "Apply" button
- **THEN** that excerpt in the textarea is replaced with the suggestion
