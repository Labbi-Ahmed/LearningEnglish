> Apply groups in order. Groups 5–10 each isolate one fetch (leaderboard, subscribe, test-push, daily cron, weekly cron). Run lint + typecheck after every group.

## 1. Migration + env

- [x] 1.1 Create `supabase/migrations/005_engagement.sql`: tables `user_xp_events(user_id, source, ref_id, amount, created_at)` with `unique(user_id, source, ref_id)`; `user_badges(user_id, badge_key, earned_at)` with `unique(user_id, badge_key)`; `push_subscriptions(user_id, endpoint, keys jsonb, created_at)` with `unique(user_id, endpoint)`. Add `profiles.last_active_at`, `profiles.email_weekly default false`, `profiles.display_name`. Enable RLS + per-user policies. Apply via dashboard.
- [x] 1.2 Add env vars: `RESEND_API_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. Update `lib/env.ts`.

## 2. XP + streak helper + grant integration

- [x] 2.1 Create `src/lib/engagement/xp.ts` with `grantXp(client, { source, ref_id, amount })` — inserts ledger row (idempotent via unique index), increments `profiles.xp`, calls streak helper.
- [x] 2.2 Create `src/lib/engagement/streak.ts` with `recomputeStreak(client, userId)` — reads recent ledger days and updates `profiles.streak`.
- [x] 2.3 Wire `grantXp` calls into result endpoints (`spell`/`sentence`/`synonym`/`quiz`), `/api/words/review`, `/api/grammar/progress`, `/api/speaking/score`, `/api/ai/chat`. Use the row's id as `ref_id`.
- [x] 2.4 Update `/api/progress/dashboard` to return real `streak`, `xp`, `badges`.

## 3. Badges

- [x] 3.1 Create `src/lib/engagement/badges.ts` with `evaluateBadges(client, userId)` invoked at the end of each grant. Insert any newly-met badges.
- [x] 3.2 Build `<BadgeGrid>` on the dashboard.

## 4. Streak / XP / Install header strip

- [x] 4.1 Build `<StreakStrip>` showing `streak.current_days`, `xp.this_week`, and a flame/spark icon.
- [x] 4.2 Build `<InstallCta>` listening for `beforeinstallprompt` and showing a button; show iOS hint on iOS Safari.

## 5. FETCH #1 — `GET /api/leaderboard/weekly`

- [x] 5.1 Create `src/app/api/leaderboard/weekly/route.ts` — aggregate `user_xp_events.amount` over 7 days, join `profiles` for `display_name`/`level`. Return privacy-safe rows.
- [x] 5.2 Build `(dashboard)/leaderboard/page.tsx` highlighting the caller's row.
- [ ] 5.3 Manual smoke: with seed XP for two users, leaderboard renders ordered list.

## 6. FETCH #2 — `POST/DELETE /api/notifications/subscribe`

- [x] 6.1 Create `src/app/api/notifications/subscribe/route.ts` with `POST` (upsert) and `DELETE` (remove).
- [x] 6.2 Build `<PushPrompt>` that asks for permission, registers the SW push manager, posts the subscription.

## 7. FETCH #3 — `POST /api/notifications/test`

- [x] 7.1 Create `src/app/api/notifications/test/route.ts`. Use `web-push` server-side to send a test notification.
- [x] 7.2 Add a "Send test notification" button to `<PushPrompt>`.

## 8. FETCH #4 — `POST /api/cron/daily-reminder` (server-only)

- [x] 8.1 Create the route. Validate `CRON_SECRET` header. Query users with `streak >= 1` and zero XP today; send push to their subscriptions.
- [x] 8.2 Add the cron entry to `vercel.json` (e.g., daily at 18:00 UTC).
- [ ] 8.3 Manual smoke: hit the route locally with the secret; observe push delivered.

## 9. FETCH #5 — `POST /api/cron/weekly-summary`

- [x] 9.1 Create the route. Validate `CRON_SECRET`. For users with `email_weekly=true`, render an HTML email and send via Resend. Honor the 90%-of-cap circuit breaker.
- [x] 9.2 Add the cron entry to `vercel.json` (e.g., Mondays 09:00 UTC).
- [x] 9.3 Add a profile setting toggle for `email_weekly`.

## 10. PWA + install

- [x] 10.1 Install `next-pwa`. Configure `next.config.js` with disable in dev. Add icons 192/512.
- [x] 10.2 Confirm `public/manifest.json` matches the spec (start_url=/dashboard, display=standalone).
- [ ] 10.3 Verify install prompt fires in Chrome desktop and the app launches as standalone after install.

## 11. Definition-of-done

- [x] 11.1 Lint / typecheck / test pass.
- [ ] 11.2 Manual: end-to-end — earn XP, streak shows; install PWA; enable push; receive test push; verify weekly email render in Resend dev mode.
- [ ] 11.3 Vercel preview works including the cron routes (manual hit with secret).
- [x] 11.4 Update `docs/PHASE_8_ENGAGEMENT.md`. Tag `v1.0.0` after merge.
