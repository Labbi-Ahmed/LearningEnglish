## Why

Every word lookup currently does at least two Supabase roundtrips (`words` SELECT + `word_relations` SELECT) plus a per-user `user_words` count, even when the word has been in the durable cache for months. The Free Dictionary API itself is already deduplicated by `upsertWordFromDictionary` (`src/lib/dictionary.ts`), so the API cost is fine — but the perceived latency on cache hit is dominated by these DB reads. We want re-lookups to feel instant, and we want the per-user "is this word saved?" check to skip the DB on hot paths, while keeping the DB as the durable source of truth.

## What Changes

- Introduce a Redis cache layer (Upstash, free tier, REST-based) in front of two read paths:
  - **Public dictionary data**, keyed by normalized word. Stores the full `CachedWord` JSON.
  - **Per-user saved-word ID set**, keyed by user id. Stores the set of `word_id`s the user has saved.
- The cache is **read-through, write-around**: reads consult Redis first; on miss the route falls through to the existing DB path and writes the result back to Redis.
- The `words` cache entry is written when `upsertWordFromDictionary` succeeds (both DB-hit and fresh-insert paths).
- The saved-set entry is written when the user first lists / queries it (lazy hydration) and is incrementally updated on save/unsave.
- Wire all `user_words` mutation routes (save, delete-by-id, future review-side mutations) to keep the saved-set entry coherent.
- **Soft-fail** behavior: if `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are missing, or a Redis call errors, every code path falls through to the DB and logs a warning. Redis is an accelerator, not a hard dependency.
- Set `staleTime` / `gcTime` on the client `useQuery` in `vocabulary-search.tsx` so re-renders in the same browser session do not refetch.
- **New dependency**: `@upstash/redis`.

## Capabilities

### New Capabilities
- `word-lookup-cache`: Redis-backed two-key cache (public word JSON + per-user saved-id set) that sits in front of the existing `words` / `user_words` tables. Soft-fails to DB.

### Modified Capabilities
<!-- none -->

## Impact

- **Code**:
  - New: `src/lib/cache/redis.ts` (Upstash client + null-safe wrappers), `src/lib/cache/keys.ts`, `src/lib/cache/word-cache.ts`, `src/lib/cache/saved-set.ts`.
  - `src/lib/dictionary.ts` — read/write the word cache around the existing DB code.
  - `src/app/api/words/[word]/route.ts` (GET) — use `sismember` for the `saved` boolean; on miss fall back to the existing COUNT and prime the set.
  - `src/app/api/words/[word]/route.ts` (DELETE) — `srem(savedKey, wordId)` after the DB delete succeeds.
  - `src/app/api/words/save/route.ts` — `sadd(savedKey, wordId)` after the DB insert succeeds.
  - `src/app/(dashboard)/vocabulary/vocabulary-search.tsx` — add `staleTime` + `gcTime`.
- **Config**: two new env vars (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) added to `src/lib/env.ts` as optional.
- **DB**: no schema change. The `words` table and `user_words` remain the durable source of truth.
- **Free-tier**: Upstash free tier allows 10K commands/day, 256 MB. Word lookups + saved-set ops fit well inside this; if approached, soft-fail keeps the app working on DB alone.
- **Risk**:
  - Cache/DB drift if a write to DB succeeds and the Redis update fails. Mitigated by ordering DB-first → Redis-second, and by short TTLs (24 h on word data, 7 d on saved-id sets); a missed update self-heals on next miss.
  - Cold start: first request after deploy hits DB; subsequent requests are warm.
- **Out of scope**: full saved-word list caching with SM-2 fields, HTTP/edge caching of routes, multi-region replication. These can be follow-ups.
