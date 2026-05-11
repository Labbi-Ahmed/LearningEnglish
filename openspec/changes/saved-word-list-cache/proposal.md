## Why

`GET /api/words` powers two hot paths: the live typeahead in `vocabulary-search.tsx` (one request per debounced keystroke) and the full vocabulary list page. Both run a Supabase query that joins `user_words → words` and applies `ilike '%q%'` substring filtering. At single-user scale this is fast, but it scales poorly:

- Supabase free tier caps concurrent connections (~60). Hundreds of users typing simultaneously will saturate the pool.
- The `ilike` join runs every keystroke even though the *underlying list of saved words* changes only on save/unsave.

We already cache shared word data (`word:<slug>`) and the per-user saved-id set (`user:<id>:saved`) in Upstash. Adding a per-user "full saved list" cache lets the typeahead and list page run from Redis on every read, with the substring filter executed in Node. The DB is only touched when the cached list is stale or absent.

## What Changes

- Add a per-user Redis cache at `user:<id>:words:list` storing a JSON array of saved-word objects with the **full** display fields: `id`, `word_id`, `word`, `pos`, `meaning`, `ipa_uk`, `ipa_us`, `created_at`.
- `GET /api/words` consults Redis first:
  - If hit, the route filters the cached array by the `q` substring in Node and applies `offset`/`limit` in-memory, returning the same response shape as today.
  - If miss, the route runs the existing Supabase query, hydrates Redis with the user's **full** list (no `q` filter), then returns the requested slice.
- Save (`POST /api/words/save`) and unsave (`DELETE /api/words/[id]`) invalidate `user:<id>:words:list` after the DB write succeeds.
- 7-day TTL matches the existing `user:<id>:saved` set; expired entries rehydrate on the next miss.
- **Sign-in hydration** (eager): on a successful session creation (password sign-in server action AND OAuth callback), fire-and-forget a `hydrateUserCachesAfterSignIn(userId)` that loads the user's full saved list + saved-id set into Redis. Non-blocking — the user is redirected to `/dashboard` immediately.
- **Daily refresh cron**: a new endpoint `POST /api/cache/warm-users` runs daily at 03:30 UTC (30 min after the dictionary warm) and re-hydrates the per-user caches for every user who has been active in the last 14 days (`profiles.last_active_date >= now() - 14d`). Same `CRON_SECRET` auth, same single-flight lock pattern.
- **Soft-fail**: if Redis is unavailable, all of the above falls through to the existing DB path — no user-visible change.

## Capabilities

### New Capabilities
- `saved-word-list-cache`: per-user Redis JSON cache of the full saved-word list, used by both the typeahead and the vocabulary list page.

### Modified Capabilities
<!-- none -->

## Impact

- **Code**:
  - New: `src/lib/cache/saved-list.ts` with `getSavedListFromCache`, `putSavedListInCache`, `invalidateSavedList`, and `hydrateUserCachesAfterSignIn` (single DB query → both list + saved-set caches).
  - `src/lib/cache/keys.ts` adds `savedListKey(userId)`.
  - `src/app/api/words/route.ts` reads from cache, filters in Node, falls back to DB on miss.
  - `src/app/api/words/save/route.ts` and `src/app/api/words/[word]/route.ts` (DELETE) invalidate the list cache after the DB write.
  - `src/app/api/auth/callback/route.ts` (OAuth) and `src/app/(auth)/login/actions.ts:signInAction` (password) call `void hydrateUserCachesAfterSignIn(user.id).catch(...)` after successful session.
  - New: `src/app/api/cache/warm-users/route.ts` — cron-authenticated endpoint that hydrates active users in batches.
  - `vercel.json` — add daily cron at 03:30 UTC.
- **DB**: no schema change.
- **Upstash usage**: one cache entry per active user, ~5–15 KB. With 1000 active users that's ~10 MB — well under the 256 MB Upstash free tier. Read/write commands: one `GET` per typeahead session (cached for 7 d), one `SET` per save/unsave, two `SET`s per sign-in (list + saved-set), and roughly 2 × active-user-count `SET`s per day from the cron. With 1000 daily-active users that's ~2000 cron commands + ~500 sign-in commands ≈ 2.5K/day — well within the 10K free-tier ceiling.
- **Risk**:
  - Cached list stale after an out-of-band `user_words` mutation (e.g. SM-2 review changes `created_at`? — it does not). Mitigation: 7-day TTL, plus explicit invalidation on save/unsave.
  - Large lists (10K+ saved words) bloat the cache entry. Mitigation: hard cap of 5000 entries per cached list; lists larger than that bypass the cache and read DB directly (logged).
- **Out of scope**: caching the full word details (`meaning`, examples) — that's already covered by `word:<slug>`; caching review/dashboard queries; cross-user search.
