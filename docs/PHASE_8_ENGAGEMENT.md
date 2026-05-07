# Phase 8 — Engagement, PWA & Gamification

## Overview

Adds XP, streaks, badges, leaderboard, push notifications, weekly email digest, and PWA install support.

## Features

### XP Ledger

- Source: `user_xp_events` table with `UNIQUE(user_id, source, ref_id)` — idempotent grants.
- Error code `23505` (unique_violation) is silently skipped.
- Amounts: game=10, review=5, lesson=20, speaking=15, chat=5, streak_bonus=25.
- `grantXp()` recomputes total from ledger sum (no race-prone increment), then runs streak + badge evaluation.

### Streak

- `recomputeStreak()` derives consecutive UTC calendar days from XP event timestamps.
- Updates `profiles.streak_count` and `profiles.last_active_at`.

### Badges

Six badge rules evaluated after every XP grant: `first_word`, `ten_words`, `first_review`, `seven_day_streak`, `first_lesson`, `first_speaking`.

### Leaderboard

- `GET /api/leaderboard/weekly?limit=20` — top users by XP in the past 7 days.
- Page: `/leaderboard`.

### Push Notifications

- `POST /api/notifications/subscribe` — upsert subscription; `DELETE` — remove.
- `POST /api/notifications/test` — send a test push to the authenticated user.
- `GET /api/cron/daily-reminder` — daily 08:00 UTC push to all subscribers. Protected by `CRON_SECRET`.
- Stale subscriptions (410/404) auto-removed.

### Weekly Email

- `GET /api/cron/weekly-summary` — Monday 09:00 UTC, sends XP/streak summary via Resend to opted-in users.
- Capped at 630 recipients (≈90% of Resend free tier 700/wk limit).
- `POST /api/email/weekly-toggle` — toggle `profiles.email_weekly`.

### PWA

- `@ducanh2912/next-pwa` wrapper in `next.config.mjs`, disabled in development.
- `public/manifest.json` updated: `start_url=/dashboard`, 192×512 icons at `public/icons/`.
- `<InstallCta>` listens for `beforeinstallprompt` and shows install/dismiss buttons.

## Dashboard Updates

- `<StreakStrip>` — shows streak days, total XP, weekly XP.
- `<BadgeGrid>` — shows all 6 badges, earned/locked state.
- `<PushPrompt>` — enable/disable daily reminders with test button.
- `<InstallCta>` — PWA install prompt (auto-hides when installed or dismissed).
- Dashboard API `/api/progress/dashboard` now returns `streak.current_days`, `xp.{total,this_week}`, `badges[]`.

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `RESEND_API_KEY` | Optional | Weekly email digest |
| `RESEND_FROM_EMAIL` | Optional | Sender address |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Optional | Push notifications |
| `VAPID_PRIVATE_KEY` | Optional | Push notifications |
| `VAPID_SUBJECT` | Optional | VAPID contact |
| `CRON_SECRET` | Optional | Protect cron endpoints |

All engagement env vars are optional — app starts without them, routes return 503 if unconfigured.

## Cron Schedule (vercel.json)

| Path | Schedule |
|---|---|
| `/api/cron/daily-reminder` | `0 8 * * *` (08:00 UTC daily) |
| `/api/cron/weekly-summary` | `0 9 * * 1` (09:00 UTC every Monday) |

## Acceptance Criteria

- [x] XP granted on: game session, word review, lesson completion (first time only), speaking score, chat turn
- [x] Streak computed from XP event timestamps, updates `profiles.streak_count`
- [x] Badges awarded automatically after XP grant
- [x] Weekly leaderboard API and page
- [x] Push subscribe/unsubscribe/test endpoints
- [x] Daily reminder cron
- [x] Weekly summary email cron with 90% cap guard
- [x] Email weekly toggle
- [x] PWA manifest + next-pwa config
- [x] Dashboard shows StreakStrip, BadgeGrid, InstallCta, PushPrompt
- [x] `npm run typecheck` and `npm run lint` pass
