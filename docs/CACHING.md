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

## When to add a new cache entry

- Add a key helper in `src/lib/cache/keys.ts`.
- Use the null-safe wrappers in `src/lib/cache/redis.ts` (never call
  `redis.get` etc. directly — wrappers handle the missing-client and
  error-swallowing semantics).
- Document the key, TTL, and invalidation rule in the table above.
