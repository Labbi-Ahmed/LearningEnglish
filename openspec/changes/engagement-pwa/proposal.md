## Why

Phase 8 of `Project-plan/fullPlane.md` — `feature/engagement`. The MVP is functionally complete after Phase 7; this phase ships the retention loop: streaks, XP, badges, push notifications, weekly email summary, leaderboard, and PWA install. After this, the project is tagged `v1.0.0` and goes public.

## What Changes

- Add `005_engagement.sql` migration: a `user_xp_events` table (ledger of XP grants), a `user_badges` table, and indexes. Augment `profiles` with `last_active_at timestamptz` if not already present.
- Implement XP grants server-side at the points where users earn them: completing a review, finishing a game round, completing a grammar lesson, completing a speaking attempt, finishing a chat turn. Each grant inserts a `user_xp_events` row and bumps `profiles.xp`.
- Implement streak computation: derived from distinct UTC days with at least one XP event in `user_xp_events`. Update `profiles.streak` server-side once per request via a small helper.
- Implement `GET /api/leaderboard/weekly` — returns top-N users by XP earned in the trailing 7 days; only `display_name`/level/xp exposed (privacy).
- Implement `POST /api/notifications/subscribe` — stores the user's Web Push subscription on a new `push_subscriptions` table.
- Implement `POST /api/notifications/test` — server triggers a push for the calling user to verify the subscription.
- Add a server-side scheduled job (Vercel Cron) `/api/cron/daily-reminder` that pushes a notification to users whose streak is at risk (no activity today and a streak ≥ 1).
- Add a weekly email summary via Resend (`/api/cron/weekly-summary`) listing the user's stats from Phase 7.
- Wire up `next-pwa`: service worker, offline shell for the dashboard, manifest icons, install prompt.
- Build UI: a "Streak/XP/Badges" header strip on the dashboard; a `(dashboard)/leaderboard` page; an in-app prompt to enable notifications; an "Install app" CTA where supported.

Out of scope: friend invites/social features (v2), payment, mobile-native apps, native iOS push (Web Push only).

## Capabilities

### New Capabilities

- `engagement-xp`: XP grants and streak computation.
- `engagement-badges`: badge unlock rules (e.g., "first 10 saved", "7-day streak", "first lesson") and the `user_badges` ledger.
- `engagement-leaderboard`: weekly leaderboard endpoint + UI.
- `engagement-push`: Web Push subscription management and the daily-reminder cron.
- `engagement-email`: Resend-based weekly summary cron.
- `engagement-pwa`: installable PWA shell, offline cache strategy.

### Modified Capabilities

- `progress-stats`: `streak.current_days` becomes real (was a placeholder in Phase 7). Spec delta below.

## Impact

- **Code (new)**: `supabase/migrations/005_engagement.sql`; `src/lib/engagement/{xp.ts,streak.ts,badges.ts}`; `src/app/api/leaderboard/weekly/route.ts`; `src/app/api/notifications/subscribe/route.ts`; `src/app/api/notifications/test/route.ts`; `src/app/api/cron/daily-reminder/route.ts`; `src/app/api/cron/weekly-summary/route.ts`; `src/app/(dashboard)/leaderboard/page.tsx`; `src/components/engagement/{streak-strip.tsx,badge-grid.tsx,install-cta.tsx,push-prompt.tsx}`; `src/lib/schemas/engagement.ts`; service-worker `public/sw.js` (next-pwa-managed); `vercel.json` cron config.
- **Code (modified)**: result/review/lesson/chat endpoints now call `grantXp(...)`; the stats endpoint reads real streak.
- **Dependencies**: `next-pwa`, `resend`, `web-push`. All in the locked stack.
- **Database**: new tables `user_xp_events`, `user_badges`, `push_subscriptions`; column add on `profiles`.
- **Free-tier risk**: Resend caps at 3k/month — only send weekly summary to opted-in users (`profiles.email_weekly = true`, defaulted off). Vercel cron on free tier supports daily/weekly cadence.
- **Downstream**: this is the last phase; merging tags `v1.0.0`.
