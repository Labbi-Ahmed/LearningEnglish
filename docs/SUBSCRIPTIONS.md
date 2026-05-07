# Subscriptions and daily quotas

This app caps daily usage of paid-tier features (AI, games, speaking, word saves) per user, since the project runs on free tiers (Vercel + Supabase + Gemini). Tiers exist in the schema today; payment integration ships later.

## Tiers

| Tier | Multiplier | Notes |
|------|-----------|-------|
| `free` | 1× | default for every new signup |
| `pro` | 5× | reserved for future paid plan |
| `pro_max` | 10× | reserved for future paid plan |
| `author` | unlimited | bypasses every daily limit (for the project owner) |

Free-tier daily limits live in `src/lib/quotas/limits.ts`. To change a number anywhere, edit `FREE_LIMITS`. Pro/Pro Max derive automatically via `TIER_MULTIPLIER`.

## Hard input caps (apply to every tier including author)

| Action | Words | Chars | Notes |
|--------|------:|------:|-------|
| AI chat prompt | 20 | 150 | enforced server-side via Zod |
| Writing feedback input | 50 | 200 | enforced server-side via Zod |
| Sentence rephrase | 30 | 200 | enforced server-side via Zod |
| Speaking attempt | — | — | recorder auto-stops at 60 s |

## How counting works

- A row in `daily_usage (user_id, action, day, count)` tracks consumption.
- `day` defaults to current UTC date — quotas reset at UTC midnight.
- The Postgres function `consume_daily_quota(user_id, action, limit)` does an atomic check-and-increment via `INSERT ... ON CONFLICT DO UPDATE WHERE count < limit`. If the WHERE clause fails the function returns NULL, which the application treats as `quota_exceeded`.
- 429 response shape: `{ error: "quota_exceeded", tier, limit, used, action, resets_at }`.
- Author tier short-circuits before any DB write.

## Promoting a user

Authors get an admin UI at `/admin/users` (see `docs/ADMIN.md`). Promotion to `author`
itself is still done by service-role SQL — there is no in-app way to grant the role.
Run the SQL directly against the Supabase project (Dashboard → SQL Editor):

```sql
-- Promote yourself to author (no limits)
update user_subscriptions
   set tier = 'author', updated_at = now()
 where user_id = (select id from auth.users where email = 'YOU@example.com');

-- Promote a user to pro
update user_subscriptions
   set tier = 'pro', plan_started_at = now(), updated_at = now()
 where user_id = '00000000-0000-0000-0000-000000000000';
```

Allowed values: `free`, `pro`, `pro_max`, `author` (any other value is rejected by the table CHECK constraint).

## Plans table and reporting (migration 0021)

`0021_plans_and_events.sql` introduces:

- **`plans`** — one row per plan with `id`, `name`, `multiplier`, `price_cents`, `billing_interval`, `is_active`, `is_purchasable`. The `user_subscriptions.tier` column now references `plans.id` (FK), not just a CHECK list.
- **`subscription_events`** — append-only audit log. A trigger on `user_subscriptions` writes one row per change with `from_plan_id`, `to_plan_id`, and a `reason` (`signup` | `admin_upgrade` | `admin_downgrade` | `cancel` | `payment` | `backfill`).
- **`plan_distribution`** — convenience view: plan name + active user count.

### Sales / ops queries

```sql
-- Active users per plan
select * from plan_distribution;

-- MRR (monthly recurring revenue, when paid plans go live)
select sum(p.price_cents) / 100.0 as mrr_dollars
from user_subscriptions us join plans p on p.id = us.tier
where p.price_cents > 0;

-- Recent upgrades (last 30 days)
select to_plan_id, count(*) from subscription_events
where reason = 'admin_upgrade' and occurred_at > now() - interval '30 days'
group by to_plan_id;

-- Per-user history
select * from subscription_events where user_id = '<uuid>' order by occurred_at desc;
```

### Editing plans without a deploy

Update price or visibility from SQL — the `/usage` page reads from `plans` at request time:

```sql
update plans set price_cents = 599 where id = 'pro';
update plans set is_active = false where id = 'pro_max';   -- hide a plan
```

Note: limit *multipliers* still live in `src/lib/quotas/limits.ts` for runtime quota checks. The `multiplier` column on `plans` is for display/reporting; keep them in sync if you ever change them.

## When payments ship

The `user_subscriptions` table reserves `plan_expires_at` for that day. The current code does not consult it — when a payment provider is wired up, gate non-free tiers on `plan_expires_at IS NULL OR plan_expires_at > now()`. A `payments` table can be added then.

## Operational notes

- `daily_usage` grows ~ N rows per active user per day. Either truncate older than 30 days via a Supabase scheduled function, or accept the cost — at typical free-tier volume it is negligible.
- Tier reads are cached in-process per request (`getTier`); Vercel's stateless functions keep this safe.
- Adding a new gated endpoint: register a new action in `QUOTA_ACTIONS`, set its limit in `FREE_LIMITS`, then call `assertWithinQuota` after auth. That's it.
