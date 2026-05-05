## ADDED Requirements

### Requirement: Push subscription endpoint

The system SHALL expose `POST /api/notifications/subscribe` accepting a Web Push subscription JSON. The endpoint MUST upsert into `push_subscriptions` keyed by `(user_id, endpoint)`. A `DELETE` variant MUST remove the subscription on user opt-out.

#### Scenario: Subscribe
- **WHEN** the user grants notification permission and POSTs their subscription
- **THEN** a `push_subscriptions` row is upserted

#### Scenario: Unsubscribe
- **WHEN** the user disables notifications and DELETEs the subscription
- **THEN** the row is removed; future cron pushes skip them

### Requirement: Test push endpoint

The system SHALL expose `POST /api/notifications/test` that triggers a single push to all of the caller's subscriptions for verification.

#### Scenario: Successful test
- **WHEN** the user has at least one valid subscription and POSTs to `/api/notifications/test`
- **THEN** a push notification is delivered

### Requirement: Daily reminder cron

The system SHALL run a daily Vercel Cron at `/api/cron/daily-reminder` that, for users whose `profiles.streak >= 1` and who have no `user_xp_events` row today, sends a Web Push reminder. The route MUST require a `CRON_SECRET` header to prevent abuse.

#### Scenario: Streak at risk
- **WHEN** at 18:00 UTC a user has streak 5 and zero events today
- **THEN** the cron sends them a "Don't break your 5-day streak!" push

#### Scenario: Already active today
- **WHEN** the user already earned XP today
- **THEN** the cron skips them
