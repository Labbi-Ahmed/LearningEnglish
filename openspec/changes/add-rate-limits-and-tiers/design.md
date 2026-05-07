## Context

The app runs entirely on free tiers (Vercel + Supabase + Gemini). Today, every signed-in user can call the AI endpoints without any per-user limit; only the implicit Gemini upstream quota protects us. The risk is twofold: a few users can drain the daily Gemini quota for everyone, and abuse (loops, scripts) can run up Supabase row counts.

Constraints:
- No payment provider in this iteration — only the schema and tier model are introduced. The owner upgrades their own account to `author` manually via SQL.
- Project rule (CLAUDE.md): all schema changes go in a new `supabase/migrations/NNNN_*.sql` file; never edit existing ones.
- Project rule: Zod for all API input validation, server actions preferred, RLS on every new table.
- The current latest migration is `0015_profiles_engagement_columns.sql`, so the new file is `0016_subscriptions_and_usage.sql`.

## Goals / Non-Goals

**Goals:**
- Enforce a single, easy-to-tune set of daily quotas per tier.
- Make `author` a true bypass — zero overhead in the hot path beyond a tier read.
- Return a structured `429` so the client can render a friendly upgrade CTA without parsing free-text errors.
- Hard input caps (word/char) on AI prompts independent of quotas (cheap defense in depth).
- Schema future-proofed for payments without committing to a provider yet.

**Non-Goals:**
- Real billing, Stripe, or any payment provider.
- Admin UI; SQL is the admin tool.
- Per-minute or burst limits — daily counts only.
- Per-organization plans.
- Time-zone-aware reset windows.

## Decisions

### 1. Two tables: `user_subscriptions` + `daily_usage`

Chosen over a single denormalized "user limits" row because:
- `user_subscriptions` is rarely written (only on signup and upgrades) and is a clear extension point for payments later (`plan_started_at`, `plan_expires_at`, future `provider`, `provider_customer_id`).
- `daily_usage` is high-write, narrow, and naturally truncate-able (we can purge rows older than ~30 days with a simple cron).

Schema sketch:
```sql
create table user_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free','pro','pro_max','author')),
  plan_started_at timestamptz default now(),
  plan_expires_at timestamptz,         -- nullable; reserved for paid plans
  updated_at timestamptz default now()
);

create table daily_usage (
  user_id uuid references auth.users(id) on delete cascade,
  action text not null,                -- e.g. 'ai_chat', 'ai_feedback', 'word_save', 'game_spell'
  day date not null default (now() at time zone 'utc')::date,
  count int not null default 0,
  primary key (user_id, action, day)
);
```

RLS:
- `user_subscriptions`: select for owner; updates only via service role (admin) — no self-upgrade path in app code.
- `daily_usage`: select for owner; insert/update only via service role from the enforcement helper. (We use the service-role client inside the helper to bypass RLS on writes — same pattern already used elsewhere in this codebase.)

Auto-create row for new users via the existing profile trigger pattern (insert default `free` row when `auth.users` row is created).

**Alternative considered**: store tier on `profiles` and quotas in Redis. Rejected — adds a new dependency (Upstash etc.), and we want everything inside Supabase free tier. Postgres counters at this volume are cheap.

### 2. Limits config: a single TS module

`src/lib/quotas/limits.ts` exports:
```ts
export const QUOTA_ACTIONS = ['ai_chat','ai_feedback','ai_rephrase','word_save','speaking_attempt','game_spell','game_sentence','game_synonym','game_quiz'] as const;
export type QuotaAction = typeof QUOTA_ACTIONS[number];
export type Tier = 'free' | 'pro' | 'pro_max' | 'author';

export const FREE_LIMITS: Record<QuotaAction, number> = { ai_chat: 5, ai_feedback: 5, ai_rephrase: 5, word_save: 20, speaking_attempt: 10, game_spell: 10, game_sentence: 10, game_synonym: 10, game_quiz: 10 };
export const TIER_MULTIPLIER: Record<Tier, number> = { free: 1, pro: 5, pro_max: 10, author: Infinity };
export const INPUT_CAPS = { ai_chat: { words: 20, chars: 150 }, ai_feedback: { words: 50, chars: 200 }, ai_rephrase: { words: 30, chars: 200 } } as const;
```

Single source of truth; tweaking a number is one diff.

**Alternative considered**: store limits in DB so they can change without deploy. Rejected — premature; we don't yet have an admin UI, and config-as-code keeps the change reviewable.

### 3. Enforcement helper: `assertWithinQuota`

`src/lib/quotas/enforce.ts`:
```ts
async function assertWithinQuota(supabase, userId, action: QuotaAction): Promise<{ remaining: number; limit: number; tier: Tier }>
```
- Reads tier (one row, indexed PK lookup).
- If `author`, returns `{ remaining: Infinity, limit: Infinity, tier: 'author' }` and increments nothing.
- Else atomically `INSERT ... ON CONFLICT (user_id, action, day) DO UPDATE SET count = daily_usage.count + 1 RETURNING count`.
- If `count > limit` then DECREMENT (or just compare and abort before increment via a CTE). Throws `QuotaExceededError` with `{ limit, used, tier, resetsAt }`.

Implementation detail: do the limit check + increment in **one** SQL statement using a CTE that only inserts/updates if count < limit. Simpler than two round-trips and avoids races.

API routes catch `QuotaExceededError` and return:
```json
{ "error": "quota_exceeded", "tier": "free", "limit": 5, "used": 5, "action": "ai_chat", "resets_at": "2026-05-08T00:00:00Z" }
```
HTTP 429.

### 4. Hard input caps in Zod schemas

`src/lib/schemas/ai.ts` adds explicit `.max()` and a custom word-count refinement. Hard 400 if violated; never reaches the quota helper. Client-side mirrors the same cap to give nice form-level errors.

### 5. Client UI: `<QuotaIndicator action={...} />` and the `/usage` page

`<QuotaIndicator>` — small server-component shown next to a single feature (e.g., `"3 of 5 left today"`). On 429, mutation handlers swap in an inline upgrade CTA (`"You've used today's free AI chats — Pro coming soon"`). Tier badge on `/profile` reads `user_subscriptions.tier`.

`/usage` page (new dashboard route) — lists every tracked action in a single view with:
- a labelled progress bar showing percentage used (e.g., `AI chat — 60%`, `3 / 5`)
- the user's current tier badge at the top
- a single "Resets in 4h 12m" countdown (next UTC midnight) displayed once at the top — same reset applies to all actions
- friendly empty states for actions with `0` usage today
- for `author` tier, the bars are replaced with an "Unlimited" pill per row

Server fetches all of today's `daily_usage` rows for the user in a single query, joins against `FREE_LIMITS * TIER_MULTIPLIER[tier]` in TS, and returns a typed view model.

### 6. Reset semantics

UTC midnight only. The `day` column defaults to `(now() at time zone 'utc')::date`. The helper computes `resetsAt` as next UTC midnight. Acceptable trade-off for global users on a free product.

## Risks / Trade-offs

- **Risk**: race between two concurrent requests both reading `count = limit - 1`.
  **Mitigation**: do the check + increment in a single SQL statement (CTE with conditional insert/update) so Postgres serializes via the unique PK.

- **Risk**: `daily_usage` grows unbounded.
  **Mitigation**: Supabase scheduled function (already used elsewhere) to delete rows where `day < current_date - 30`. Out of scope to wire up in this change but noted in tasks.

- **Risk**: developers forget to call `assertWithinQuota` on a new endpoint.
  **Mitigation**: helper colocated with limits, documented in `docs/`. Future improvement: a withQuota wrapper for route handlers.

- **Trade-off**: UTC-only reset — confusing for users far from UTC, but per-user TZ doubles complexity for a free-tier app.

- **Trade-off**: limits in code, not DB — every tweak needs a deploy. Acceptable for now; flip to DB-backed when there's a real need.

## Migration Plan

1. Ship migration `0016_subscriptions_and_usage.sql` (additive — no data loss possible).
2. Backfill: insert a `free` subscription row for every existing user (`insert into user_subscriptions (user_id) select id from auth.users on conflict do nothing`).
3. Manually `update user_subscriptions set tier = 'author' where user_id = '<owner uuid>'`.
4. Deploy code with quota enforcement enabled. Quotas start counting from day 0 — first day's counts only cover post-deploy traffic, which is fine.
5. Rollback: revert deploy. The tables can stay; they're additive and unused if code rolls back.

## Open Questions

- Should `ai_rephrase` share the `ai_chat` bucket or have its own? **Decision (taken):** its own bucket of 5/day on free, since user feedback indicated rephrase is a different mental model than chat. Easy to merge later.
- Do we want a tiny "1 free retry" allowance after 429? **Decision:** no — keep semantics dead simple.
- Where exactly do game-play counters increment? Likely in the existing `game_results` POST handler. Confirm during implementation.
