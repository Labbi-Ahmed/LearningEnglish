## Context

`upsertWordFromDictionary` (`src/lib/dictionary.ts:25-78`) is the single integration point for dictionary data. It already implements a DB-first cache: SELECT from `words`, on miss call Free Dictionary, insert, translate. Per `CLAUDE.md`, "A word looked up once should live in the `words` table forever."

The caller `GET /api/words/[word]` (`src/app/api/words/[word]/route.ts`) does an additional COUNT against `user_words` to compute a personalized `saved` boolean. Save (`src/app/api/words/save/route.ts`) and unsave (`DELETE /api/words/[id]`, same route file) mutate `user_words`. Review (`src/app/api/words/review/route.ts`) updates SM-2 fields but doesn't change set membership.

On the client, the lookup `useQuery` has no `staleTime`, so every remount of `/vocabulary` triggers a fresh `GET /api/words/<word>`.

We're adding a Redis cache (Upstash free tier, REST-based) that:
- Stores the full `CachedWord` JSON keyed by normalized word.
- Stores the saved-word ID set per user.
- Soft-fails to the DB if Redis is unreachable or unconfigured.

## Goals / Non-Goals

**Goals:**
- Sub-DB latency for repeated reads of `words` rows and per-user `saved` checks.
- Single cache layer (Redis) — no in-process LRU.
- Zero schema changes; DB remains source of truth.
- Graceful degradation: missing/down Redis ⇒ normal DB-only behavior + log line, no user-visible error.
- Coherence between DB and Redis maintained by always writing DB first, then Redis.

**Non-Goals:**
- Caching the full saved-word list with SM-2 fields. Cache only the ID set.
- Caching review/dashboard queries.
- HTTP/CDN edge caching of routes.
- Multi-region or cluster considerations.
- A second in-process LRU layer.

## Decisions

### 1. Upstash Redis (REST)
Use `@upstash/redis` over HTTP. Works in any Vercel runtime, no connection pooling concerns, free tier covers our scale.
- **Alternative considered**: `ioredis` over TCP — needs connection pooling in serverless and is harder to operate.

### 2. Two cache shapes
- `word:{slug}` → JSON string of `CachedWord` (full dictionary data including Bangla and synonym/antonym arrays). TTL 24 h.
- `user:{userId}:saved` → Redis Set of `word_id`s. TTL 7 d.

`saved`-set TTL is long but not infinite; on expiry the next lookup re-hydrates from DB. This bounds drift if a Redis write is ever lost.

### 3. Key helper module (`src/lib/cache/keys.ts`)
Centralizes key prefixes so future additions follow the same convention:
```ts
export const wordKey = (slug: string) => `word:${slug.toLowerCase()}`;
export const savedSetKey = (userId: string) => `user:${userId}:saved`;
```

### 4. Null-safe Redis wrapper (`src/lib/cache/redis.ts`)
- Reads env vars once; if either is missing, exports `null` as the client.
- Provides `safeRedis` helpers (`safeGet`, `safeSet`, `safeSadd`, `safeSrem`, `safeSismember`, `safeSmembers`) that all return `null` on missing client or any thrown error after logging. Callers treat `null` as cache miss / no-op.
- **Why**: the route code stays linear and free of try/catch noise. One module owns "is Redis available right now?" semantics.

### 5. Read-through, write-around, write-after-DB
- **Read**: cache.get → on miss, DB read → on DB success, cache.set (fire-and-forget but awaited so errors are observed).
- **Write (save / unsave)**: DB write first → on success, `sadd`/`srem`. If Redis fails, log and continue; the user response is still 200. Set TTL ensures self-healing on next miss.
- **Why DB-first**: avoids the failure mode where Redis says "saved" but the row never landed.

### 6. Lazy hydration of saved-set
First time a user's saved-set is queried (or membership checked), the route:
1. Checks Redis with `sismember`.
2. If the key does not exist (`exists` returns 0), the route falls back to the existing DB COUNT for that single word, then asynchronously hydrates the full set with a single `SELECT word_id FROM user_words WHERE user_id = ?` + `sadd`.
3. Subsequent membership checks hit Redis.

This avoids cold-start surprise: the first miss is no worse than today.

### 7. Word cache invalidation
The only mutation path for the `words` row is `upsertWordFromDictionary` itself. After translation backfill it updates the row and re-`set`s the cache. No external invalidation needed for v1.

### 8. Client `staleTime` of 24 h
Unchanged from the prior plan: set `staleTime: 24h` and `gcTime: 24h` on the `["word", activeWord]` query so re-mounts of `/vocabulary` don't refetch.

### 9. Soft-fail observability
All Redis errors log with prefix `[cache:redis]` and the operation name. No telemetry beyond console.error for v1.

## Risks / Trade-offs

- **[Risk] DB write succeeds, Redis write fails (save/unsave)** → Mitigation: short TTL on saved-set means inconsistency self-heals on next miss; log lets you spot recurring failures.
- **[Risk] Stale word JSON if the row is ever edited outside `upsertWordFromDictionary`** → Mitigation: 24 h TTL bounds the staleness window. If a future feature edits the row, it must call a `invalidateWordCache(word)` helper (out of scope for this change but easy to add).
- **[Risk] Set membership false-positive after Redis loss + DB unsave** → Mitigation: same TTL bound; also we always DB-delete first, then `srem`. A short window of false positive is acceptable for the `saved` star icon.
- **[Risk] Free-tier limits exceeded** → Mitigation: 10K commands/day is far above expected load; soft-fail means we degrade to DB-only when exhausted.
- **[Trade-off] Two round-trips on save flow** (DB + Redis) → Network cost is small (~10 ms) compared to ergonomic win.
- **[Trade-off] No caching of list endpoint** → `GET /api/words` still hits DB. Listed scope intentionally to keep invalidation surface small. Can be added later by caching the per-user list payload.

## Migration Plan

1. Provision Upstash Redis (free tier). Copy REST URL + token into Vercel env (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) and into local `.env.local`.
2. Ship the code with optional env vars. On environments where they are unset (e.g. preview without secrets), Redis is `null` and routes fall through to DB.
3. Verify in production with two quick checks: `redis-cli` (or Upstash console) shows `word:hello` after a lookup, and `user:<uuid>:saved` shows IDs after a save.
4. No data migration. Rollback = remove the env vars or `git revert`; no DB state to undo.

## Open Questions

- Do we want to ship a `/api/admin/cache/clear` endpoint for authors to wipe the cache on demand? Out of scope; can be added later if needed.
- Should we add `redis-mock` or a fake to the Vitest setup for the new cache helpers, or rely on integration smoke? Default: rely on smoke for now; unit-test the key helpers and the null-safe wrapper logic without hitting a network.
