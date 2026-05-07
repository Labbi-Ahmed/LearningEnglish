## Why

The app is hosted on free tiers (Vercel + Supabase + Gemini). Without per-user limits, a small number of active users can exhaust the daily Gemini quota, blow up Supabase row counts, and stall the app for everyone. We also want a clean upgrade path for a future paid plan without rewriting auth or routes later. Introducing tiers and daily quotas now lets us protect the free service today and ship payments later as a swap-in.

## What Changes

- Add a per-user **subscription tier** (`free`, `pro`, `pro_max`, `author`) defaulting to `free` for new signups. `author` bypasses all limits and is set manually in SQL by the project owner.
- Add **daily usage tracking** keyed by `(user_id, action, day)` and reset at UTC midnight.
- Enforce daily quotas on AI chat, AI writing feedback, AI sentence rephrase, word lookups/saves, speaking attempts, and game plays — server-side, with a structured `429` response.
- Enforce **hard input caps** (word count + char length) on AI prompts and writing input via Zod schemas — these are not quota-based, they are absolute.
- Surface remaining-quota counters in the UI on each gated feature, plus a tier badge on the Profile page and a non-blocking "Pro coming soon" hint for free users.
- Provide a dedicated **/usage** page where the user can see, at a glance, the percentage used of every daily limit and the exact time the limits reset.
- Schema is forward-compatible with future payment integration (`plan_started_at`, `plan_expires_at` columns reserved; tier column accepts new values).
- Limits live in a single config module so a tier or number can be tweaked in one place.

## Capabilities

### New Capabilities
- `subscription-tiers`: per-user tier model, default assignment, and admin manual upgrade path
- `usage-quotas`: daily usage counters, quota enforcement helper, structured 429 responses, and a user-visible /usage dashboard
- `input-caps`: hard word/char limits on AI inputs (Zod-enforced, separate from daily quotas)

### Modified Capabilities
<!-- None — this project does not yet have committed specs in openspec/specs/. -->

## Impact

- **Database**: new migration `supabase/migrations/0016_subscriptions_and_usage.sql` adding `user_subscriptions` and `daily_usage` tables with RLS policies. Additive only.
- **Server**: new `src/lib/quotas/` module (limits config + `assertWithinQuota` helper). Updates to:
  - `src/app/api/ai/chat/route.ts`
  - `src/app/api/ai/writing-feedback/route.ts`
  - `src/app/api/ai/sentence-rephrase/route.ts`
  - word lookup/save endpoints under `src/app/api/words/*`
  - game-play tracking endpoints under `src/app/api/games/*` (or wherever game results are recorded)
- **Schemas**: `src/lib/schemas/ai.ts` gains hard word/char caps.
- **Client**: small `<QuotaIndicator />` component reused per feature; tier badge added on `/profile`. Friendly upgrade CTA on 429.
- **Auth flow**: signup trigger or post-signup hook inserts a default `free` row in `user_subscriptions`.
- **No payment integration** in this change — schema reserves columns only.
- **No CI / build changes**.
