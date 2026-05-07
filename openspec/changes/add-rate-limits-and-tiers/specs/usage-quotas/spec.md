## ADDED Requirements

### Requirement: Daily usage tracking
The system SHALL track per-user daily usage counts keyed by `(user_id, action, day)` where `day` is the current UTC date.

#### Scenario: First action of the day
- **WHEN** a user performs a tracked action for the first time on a given UTC day
- **THEN** a `daily_usage` row SHALL be inserted with `count = 1`

#### Scenario: Subsequent action same day
- **WHEN** the user performs the same action again the same UTC day
- **THEN** the existing row's `count` SHALL be incremented atomically by 1

#### Scenario: Reset at UTC midnight
- **WHEN** the UTC date rolls over
- **THEN** the next request creates a new row for the new `day` and the user's effective remaining quota resets to the tier limit

### Requirement: Tier multipliers
Each free-tier limit SHALL be multiplied by the user's tier multiplier: `free=1`, `pro=5`, `pro_max=10`, `author=Infinity`.

#### Scenario: Pro user limit
- **WHEN** a pro user invokes `ai_chat`
- **THEN** their effective daily limit SHALL be `5 * 5 = 25` requests

#### Scenario: Promax user limit
- **WHEN** a pro_max user invokes `word_save`
- **THEN** their effective daily limit SHALL be `20 * 10 = 200` requests

### Requirement: Quota enforcement helper
A reusable helper `assertWithinQuota(supabase, userId, action)` SHALL be the single entry point for quota checks. It SHALL atomically check and increment in one SQL statement to prevent races.

#### Scenario: Within quota
- **WHEN** the helper is called and `count + 1 <= limit`
- **THEN** it SHALL increment the count and return `{ remaining, limit, tier }`

#### Scenario: Quota exceeded
- **WHEN** the helper is called and `count + 1 > limit`
- **THEN** it SHALL throw `QuotaExceededError` carrying `{ limit, used, tier, action, resetsAt }` and SHALL NOT increment the count

#### Scenario: Concurrent requests at the boundary
- **WHEN** two concurrent requests both see `count = limit - 1`
- **THEN** exactly one SHALL succeed and the other SHALL receive `QuotaExceededError`

### Requirement: 429 response shape
Routes that hit a quota SHALL return HTTP `429` with JSON body:
```
{ "error": "quota_exceeded", "tier": "<tier>", "limit": <n>, "used": <n>, "action": "<action>", "resets_at": "<iso>" }
```

#### Scenario: Free user hits AI chat limit
- **WHEN** a free user makes a 6th `ai_chat` request the same UTC day
- **THEN** the response status SHALL be `429` and the body SHALL match the documented shape with `tier = "free"`, `limit = 5`, `used = 5`

### Requirement: Tracked actions
The system SHALL track at minimum: `ai_chat`, `ai_feedback`, `ai_rephrase`, `word_save`, `speaking_attempt`, `game_spell`, `game_sentence`, `game_synonym`, `game_quiz`.

#### Scenario: Adding a new gated route
- **WHEN** a developer adds a new gated endpoint
- **THEN** they SHALL register a new action in the limits config and call the helper

### Requirement: Quota indicator on client
For each gated feature, the UI SHALL surface a small indicator showing remaining quota for the current UTC day (e.g., `"3 of 5 left today"`).

#### Scenario: Free user opens AI chat
- **WHEN** a free user opens the chat page after using 2 of 5 prompts
- **THEN** the page SHALL display `"3 of 5 left today"`

#### Scenario: Author user opens AI chat
- **WHEN** an author user opens the chat page
- **THEN** the page SHALL NOT display any remaining-quota indicator

### Requirement: Daily usage page
The system SHALL expose an authenticated route `/usage` that lists every tracked action with its percentage used today, current/limit values, and the time until the daily reset.

#### Scenario: Free user views the page
- **WHEN** a free user with usage `{ ai_chat: 3, word_save: 8 }` opens `/usage`
- **THEN** the page SHALL display a row for `AI chat` with `3 / 5 (60%)`, a row for `Word saves` with `8 / 20 (40%)`, every other tracked action at `0 / <limit> (0%)`, and a single countdown to the next UTC midnight at the top

#### Scenario: Pro user views the page
- **WHEN** a pro user opens `/usage`
- **THEN** every limit shown SHALL be the free limit multiplied by 5, and the tier badge `Pro` SHALL be visible at the top of the page

#### Scenario: Author user views the page
- **WHEN** an author user opens `/usage`
- **THEN** every action SHALL show an `Unlimited` pill instead of a progress bar, and the countdown SHALL be hidden

#### Scenario: Reset countdown
- **WHEN** the page renders at any time of day
- **THEN** the countdown SHALL display the time remaining until the next UTC midnight in `Hh Mm` format and SHALL update at least once per minute

#### Scenario: Action at limit
- **WHEN** a tracked action is at 100% usage
- **THEN** that row SHALL be visually distinguished (e.g., warning color) and labelled `Limit reached — resets in <countdown>`
