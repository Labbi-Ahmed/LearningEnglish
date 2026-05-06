## ADDED Requirements

### Requirement: Weekly summary cron

The system SHALL run a weekly Vercel Cron at `/api/cron/weekly-summary` that emails opted-in users (`profiles.email_weekly = true`) their stats for the prior 7 days via Resend. The route MUST require a `CRON_SECRET` header.

#### Scenario: Opt-in user
- **WHEN** the cron fires Monday 09:00 UTC and the user has `email_weekly=true`
- **THEN** Resend sends them an email summarizing words added, lessons completed, games played, speaking attempts, and streak

#### Scenario: Opt-out user
- **WHEN** `email_weekly=false`
- **THEN** the cron skips them

#### Scenario: Resend quota approaching
- **WHEN** the running monthly send count would exceed 2,800 (90% of 3k cap)
- **THEN** the cron stops sending and logs a warning; remaining users are skipped
