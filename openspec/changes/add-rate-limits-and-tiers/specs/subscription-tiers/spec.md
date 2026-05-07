## ADDED Requirements

### Requirement: Default tier on signup
Every new authenticated user SHALL be assigned the `free` subscription tier automatically when their account is created.

#### Scenario: New user signs up
- **WHEN** a new row is created in `auth.users`
- **THEN** a corresponding row in `user_subscriptions` SHALL be created with `tier = 'free'` and `plan_started_at = now()`

#### Scenario: Returning user without subscription row
- **WHEN** an existing pre-migration user authenticates
- **THEN** the system SHALL ensure a `user_subscriptions` row exists with `tier = 'free'` (backfill at migration time)

### Requirement: Tier values
The system SHALL recognize exactly four tiers: `free`, `pro`, `pro_max`, and `author`. Any other value MUST be rejected at the database layer.

#### Scenario: Invalid tier rejected
- **WHEN** an UPDATE attempts to set `tier = 'enterprise'`
- **THEN** the database CHECK constraint SHALL reject the write

### Requirement: Author bypass
A user with `tier = 'author'` SHALL bypass all daily usage quotas. Hard input caps still apply.

#### Scenario: Author makes request beyond free limit
- **WHEN** an author user issues a 100th AI chat request in a day
- **THEN** the request SHALL succeed and the response SHALL NOT include a quota header

### Requirement: Manual upgrade only
The application SHALL NOT expose any user-facing endpoint that mutates `user_subscriptions.tier`. Tier changes happen exclusively through service-role SQL.

#### Scenario: User attempts self-upgrade via API
- **WHEN** an authenticated user issues an UPDATE to their own `user_subscriptions` row
- **THEN** RLS SHALL deny the write

### Requirement: Forward-compatible schema
The `user_subscriptions` table SHALL include nullable `plan_started_at` and `plan_expires_at` columns reserved for future paid plans. The application SHALL ignore `plan_expires_at` until payment integration ships.

#### Scenario: Future paid tier check
- **WHEN** payment integration is added later
- **THEN** the existing schema SHALL accommodate it without a migration to add these columns
