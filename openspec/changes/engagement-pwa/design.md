## Context

Last phase. Adds the retention loop and ships v1.0.0. Touches every feature endpoint (to grant XP), introduces three crons, web push, email, and PWA installability.

## Goals

- Single `grantXp(source, ref_id, amount)` helper called from every "earn" endpoint, ledger-backed and idempotent.
- Three independent cron routes guarded by `CRON_SECRET`.
- Push and email both opt-in, both budget-aware.
- PWA installs on Chrome and iOS.

## Non-Goals

- Friend/social features.
- Native iOS/Android apps.
- Real-time multiplayer.
- AI-personalized rewards.

## Decisions

### Decision: Idempotent XP via `(source, ref_id)`

Each grant takes a `ref_id` (the originating row's id — e.g., a `game_sessions.id`). A unique index on `(user_id, source, ref_id)` makes retries safe. Avoids double-counting under network jitter without explicit locks.

### Decision: Streak update is synchronous in the grant helper

Recompute and write `profiles.streak` in the same request that grants XP. Keeps the streak strictly consistent with the ledger; cost is one extra UPDATE per grant — acceptable.

### Decision: Cron routes guarded by `CRON_SECRET` header

Vercel Cron sends a known header; we validate it. Without this, anyone could DOS our Resend or push budgets.

### Decision: Resend send-cap circuit breaker

Track a rolling 30-day count via Resend's API or our own ledger; stop sends at 90% of cap. Conservative — `feature/engagement` budget is the user-facing summary.

### Decision: Web Push only, no native FCM/APNs

Web Push works on Chrome/Edge desktop+mobile and now iOS Safari (PWA-installed only). Free, no Firebase. Trade-off: iOS users must install before they can receive push.

### Decision: Service worker via `next-pwa`

Avoids hand-rolling SW boilerplate. Trade-off: `next-pwa` lags Next.js majors occasionally — pin a known-good version.

## Risks / Trade-offs

- **Web Push iOS friction**: only post-install. Mitigation — clear copy on the install CTA.
- **Cron timing**: Vercel free-tier cron has limited cadence. Daily reminder at one fixed UTC time may miss optimal personal time zones. Acceptable for v1.
- **XP balance**: numeric tuning will need iteration. Constants in `lib/engagement/xp.ts`.

## Migration Plan

`005_engagement.sql` — additive: new tables `user_xp_events`, `user_badges`, `push_subscriptions`; columns added to `profiles` (`last_active_at`, `email_weekly` if not present, `display_name` if not present). RLS on every new user-owned table. No data backfill (existing users start at xp=0, streak=0).
