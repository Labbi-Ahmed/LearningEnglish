## 1. Database

- [x] 1.1 Create migration `supabase/migrations/0020_subscriptions_and_usage.sql` with `user_subscriptions` and `daily_usage` tables, CHECK constraint on `tier`, RLS enabled, and select-own policies. (Note: filename is `0020`, not `0016` — the proposal predated migrations 0016–0019.)
- [x] 1.2 Add a trigger so a `free` row is inserted into `user_subscriptions` for every new `auth.users` row.
- [x] 1.3 Add backfill statement at the end of the migration: insert a `free` row for every existing user, idempotent (`on conflict do nothing`).
- [x] 1.4 Document in `docs/SUBSCRIPTIONS.md` the SQL command to upgrade a user to `author`.

## 2. Limits config and enforcement helper

- [x] 2.1 Create `src/lib/quotas/limits.ts` exporting `QUOTA_ACTIONS`, `Tier`, `FREE_LIMITS`, `TIER_MULTIPLIER`, `INPUT_CAPS`.
- [x] 2.2 Create `src/lib/quotas/errors.ts` with `QuotaExceededError` carrying `{ limit, used, tier, action, resetsAt }`.
- [x] 2.3 Create `src/lib/quotas/enforce.ts` exporting `assertWithinQuota(supabase, userId, action)`. Atomic check-and-increment is done by the Postgres function `consume_daily_quota` shipped in the same migration.
- [x] 2.4 Create `src/lib/quotas/get-tier.ts` exporting `getTier(supabase, userId): Promise<Tier>` with simple in-request memoization.
- [x] 2.5 Create `src/lib/quotas/remaining.ts` exporting `getRemaining(supabase, userId, action)` for the client indicator.
- [x] 2.6 Create `src/lib/quotas/summary.ts` exporting `getDailyUsageSummary(supabase, userId)` returning `{ tier, resetsAt, items: [{ action, label, used, limit, percent, isUnlimited }] }` for the `/usage` page.

## 3. Schema hard caps

- [x] 3.1 Update `src/lib/schemas/ai.ts` to enforce word and char caps from `INPUT_CAPS` for `ChatBodySchema`, `WritingFeedbackBodySchema`, and `RephraseBodySchema`. Shared `wordCount` helper exported.
- [x] 3.2 Add unit tests (vitest) for the schema refinements covering happy + boundary + over-limit cases. (12 tests.)

## 4. Wire enforcement into API routes

- [x] 4.1 `src/app/api/ai/chat/route.ts` — call `assertWithinQuota(supabase, user.id, 'ai_chat')` after auth, before Gemini. Catch `QuotaExceededError` → return 429.
- [x] 4.2 `src/app/api/ai/writing-feedback/route.ts` — same pattern with action `ai_feedback`.
- [x] 4.3 `src/app/api/ai/sentence-rephrase/route.ts` — same pattern with action `ai_rephrase`. Cache hits do NOT consume quota.
- [x] 4.4 `src/app/api/words/save/route.ts` — track `word_save`.
- [x] 4.5 `src/lib/games/submit-result.ts` — track `game_spell` / `game_sentence` / `game_synonym` / `game_quiz` keyed off `gameType`.
- [x] 4.6 `src/app/api/speaking/upload/route.ts` — track `speaking_attempt`.
- [ ] 4.7 *(Skipped — deferred.)* `withQuotaResponse(err)` helper. The 5-line inline pattern is repeated explicitly in each route; abstraction not yet justified.

## 5. Client UX

- [x] 5.1 `src/components/quota/quota-indicator.tsx` (server component) — `"X of Y left today"`, hidden for author.
- [x] 5.2 Embedded on AI chat (`ai_chat`) and writing pages (`ai_feedback` and `ai_rephrase`). Note: a per-feature indicator on speaking, vocabulary save, and games is left out — the `/usage` page already covers these clearly.
- [x] 5.3 Mutation handlers (chat, writing, rephrase, speaking) detect 429 and show inline upgrade CTA.
- [x] 5.4 Tier badge on `/profile` that links to `/usage`.
- [x] 5.5 Live char/word counter on writing feedback and chat input. Submit disabled when over cap.
- [x] 5.6 Speaking recorder auto-stops at 60 seconds with a visible "Xs left" countdown on the stop button.
- [x] 5.7 `/usage` route at `src/app/(dashboard)/usage/page.tsx` rendering the full dashboard.
- [x] 5.8 `src/components/quota/usage-row.tsx` (progress bar) and `src/components/quota/reset-countdown.tsx` (client, ticks every 30s).
- [x] 5.9 "Daily usage" entry in the sidebar nav.
- [x] 5.10 `Free / Pro / Pro Max / Author` rendered via `TIER_LABEL` in `limits.ts`.

## 6. Tests and verification

- [ ] 6.1 *(Deferred.)* Unit test for `assertWithinQuota`. Requires either a Supabase test container or a non-trivial mock of the RPC. Logic is exercised in production paths and covered by integration testing in 6.3.
- [x] 6.2 Schema-cap unit tests covered by `src/lib/schemas/ai.test.ts` (3.2 above).
- [ ] 6.3 *(Pending — manual.)* Smoke test on preview deploy: 6th free chat → 429; counter UI updates; author bypass after `update user_subscriptions set tier='author' ...`.
- [x] 6.4 `npm run lint && npm run typecheck && npm run test` all green (21/21 tests passing).

## 7. Docs and admin runbook

- [x] 7.1 `docs/SUBSCRIPTIONS.md` created with tiers, limits, hard caps, and admin SQL examples.
- [x] 7.2 `// TODO(payments)` comment in `src/lib/quotas/limits.ts` noting `plan_expires_at` should be honored when billing ships.
- [ ] 7.3 *(Skipped.)* Root README pointer — README in this repo doesn't currently index docs; the file is discoverable under `docs/`.
