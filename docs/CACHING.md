# Caching (Upstash Redis)

The app uses Upstash Redis (free tier, REST API) as an accelerator on top of the
durable `words` and `user_words` tables. Redis is **optional** — the app works
fine without it; routes log `[cache:redis] …` and fall through to the DB.

## Env vars

| Name | Required? | Notes |
|------|-----------|-------|
| `UPSTASH_REDIS_REST_URL` | optional | from Upstash dashboard |
| `UPSTASH_REDIS_REST_TOKEN` | optional | from Upstash dashboard |

If either is absent the client (`src/lib/cache/redis.ts`) is `null` and every
helper is a no-op / cache-miss.

## Keys

All keys are constructed via helpers in `src/lib/cache/keys.ts`. Never build a
key by concatenation outside that module.

| Key | Type | TTL | Contents |
|-----|------|----:|----------|
| `word:<slug>` | string (JSON) | 24 h | full `CachedWord` for the word, including Bangla translations and synonym/antonym arrays |
| `user:<userId>:saved` | set of strings | 7 d | every `word_id` the user has saved |
| `user:<userId>:words:list` | string (JSON) | 7 d | the user's full saved-word list (`id`, `word_id`, `word`, `pos`, `meaning`, `ipa_uk`, `ipa_us`, `created_at`) used by `/vocabulary` and the typeahead |

## Read/write rules

- **Reads consult Redis first**, fall through to the DB on miss, and (on DB
  success) populate Redis.
- **DB write first, Redis write second.** A failed Redis write never blocks the
  response; the short TTL self-heals on the next miss.
- **No external invalidation** for `word:*`. The `words` row is only ever
  written by `upsertWordFromDictionary`, which re-`set`s the cache.
- **`user:*:saved` invalidation**: `POST /api/words/save` calls `sadd`;
  `DELETE /api/words/[id]` calls `srem`. SM-2 review updates do not touch
  membership.

## Inspecting

Use the Upstash console (Data Browser tab). Sample commands:

```text
GET word:hello
SMEMBERS user:00000000-0000-0000-0000-000000000000:saved
TTL word:hello
```

## Pre-warming on deploy

The runtime cache fills lazily; after a deploy or a Redis flush the first
lookup of every word pays a Supabase roundtrip. To avoid that, the project
exposes a warming endpoint that pages through `words` and writes every row
to Redis up front.

### Endpoint

```
GET  /api/cache/warm     # used by Vercel cron
POST /api/cache/warm     # for manual curl
```

Both require `Authorization: Bearer <CRON_SECRET>`. Without that header the
endpoint returns 401. If Redis is unconfigured or unreachable it returns 503.

### Schedule

A `vercel.json` cron entry runs the endpoint daily at 03:00 UTC:

```json
{ "path": "/api/cache/warm", "schedule": "0 3 * * *" }
```

Vercel cron sends the `Authorization` header automatically when `CRON_SECRET`
is set as a Vercel project env var.

### Manual run after a deploy

If you don't want to wait for the next 03:00 UTC, run:

```sh
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://<your-domain>/api/cache/warm
```

Expected response: `{ "warmed": <N>, "batches": <B> }`.

### Single-flight lock

The endpoint acquires `cache:warm:lock` via `SET NX EX 300` before paging.
A concurrent invocation returns `{ "already_running": true }` immediately.
The lock self-clears after 5 minutes if a run crashes.

### Scope

`/api/cache/warm` only refills the shared `word:*` dictionary keys.

## Per-user cache hydration

Per-user caches (`user:<id>:words:list`, `user:<id>:saved`) are populated by
three coordinated paths:

1. **Sign-in hydration** — `signInAction` (password) and `/api/auth/callback`
   (OAuth) call `hydrateUserCachesAfterSignIn(user.id)` via Next's `after()`,
   so the work runs after the redirect response is sent. Non-blocking; failures
   log `[cache:saved-list] …` and are ignored.
2. **Lazy on-miss** — the first `GET /api/words` after the cache is empty pages
   the user's full list from DB and writes both keys.
3. **Daily cron** — `POST /api/cache/warm-users` runs at `30 3 * * *` UTC
   (immediately after the dictionary warm). It refreshes the caches for every
   user whose `profiles.last_active_date` is within the last 14 days. Same
   `CRON_SECRET` auth as the other crons; single-flight lock at
   `cache:warm-users:lock` with a 10-minute TTL.

Manual run for testing:

```sh
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://<your-domain>/api/cache/warm-users
```

Expected response: `{ "refreshed": <N>, "batches": <B> }`.

## When to add a new cache entry

- Add a key helper in `src/lib/cache/keys.ts`.
- Use the null-safe wrappers in `src/lib/cache/redis.ts` (never call
  `redis.get` etc. directly — wrappers handle the missing-client and
  error-swallowing semantics).
- Document the key, TTL, and invalidation rule in the table above.
