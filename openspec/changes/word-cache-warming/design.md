## Context

The `word-lookup-cache` change shipped a Redis-backed accelerator that fills lazily on read. After a Vercel deploy or a Redis flush, the cache is cold; the first lookup of each word pays a DB roundtrip until the cache warms organically. With ~1000 words already in the `words` table today, that's a lot of unnecessarily-cold reads.

`CRON_SECRET` is already present in `src/lib/env.ts`. Vercel Hobby supports daily cron jobs at no cost. We have a working `putWordInCache` helper in `src/lib/cache/word-cache.ts` that produces the exact same shape the runtime path writes.

## Goals / Non-Goals

**Goals:**
- One endpoint that, when called, fills `word:*` for every row in `words` using the same shape and TTL as the runtime path.
- Triggered automatically on a schedule (Vercel cron) and runnable on demand via `curl` for post-deploy warming.
- Idempotent — repeated calls write the same keys with refreshed TTLs; no duplicate side-effects.
- Bounded — at most one warming run in flight at a time.

**Non-Goals:**
- Per-user cache warming (`user:*:saved`). Those rebuild lazily on demand and per-user warming would explode command count.
- Differential warming (skip words already in Redis). Adds complexity for marginal savings; a full pass is ~1000 commands, well within free-tier limits.
- Running the warm at build time (no prod Redis creds in CI).

## Decisions

### 1. Authentication via `CRON_SECRET` header
The endpoint reads `Authorization: Bearer <CRON_SECRET>` (case-insensitive). Vercel cron supports custom headers via `vercel.json`. This matches the existing `CRON_SECRET` convention already used by the cron routes under `src/app/api/cron/` (if any).
- **Alternative considered**: requiring `tier='author'` like the admin surface. Rejected because Vercel cron doesn't carry a user session.

### 2. Single-flight lock via Redis `SET NX`
Before paging, the route does `SET cache:warm:lock 1 NX EX 300`. If the lock already exists the route returns 200 with `{ already_running: true }`. The 5-minute TTL is a hard ceiling — even if the route crashes the lock self-clears.
- **Why**: prevents two overlapping crons (or a manual curl racing the cron) from doubling the command count.

### 3. Page size 500
Read `words` rows 500 at a time using Supabase `.range(from, to)`. For each batch, fan out `word_relations` SELECTs by `word_id IN (...)` then assemble `CachedWord`s and call `putWordInCache` per row.
- **Why 500?** Stays well under Postgres row limits and matches Supabase REST defaults; small enough that one batch fits in a single Vercel function invocation (10-second default on Hobby).

### 4. Reuse `putWordInCache`
The route does not call Redis directly — it goes through `src/lib/cache/word-cache.ts:putWordInCache`. This guarantees TTL and key naming match the runtime path even if either changes in the future.

### 5. Vercel cron at 03:00 UTC daily
Off-peak for both UK and US. Hits `POST /api/cache/warm` with the `Authorization` header. The 24-hour TTL means daily refresh is sufficient — keys never expire if the cron runs.
- **Trade-off**: a deploy at 23:00 UTC waits 4 hours for the next warm. Operators who care can `curl` the endpoint themselves immediately after deploy.

### 6. Soft-fail respected, but visible
If Upstash creds are missing the endpoint returns HTTP 503 with `{ error: "cache_unavailable" }` so the cron's failure surfaces in Vercel's logs (rather than silently no-op). The runtime path stays soft-fail.

## Risks / Trade-offs

- **[Risk] Cron runs while a deploy is mid-flight** → No real problem. Worst case the warm hits the previous version; the next day's cron heals.
- **[Risk] Free-tier command limit blown by accidental loop** → Single-flight lock + 24h TTL + once-a-day schedule bounds this. If something goes wrong the soft-fail in the runtime path keeps the app up.
- **[Trade-off] No differential warming** → Wasted commands re-writing keys that may not have expired. Acceptable at current scale (~1000 words). Add a `TTL` check pre-write if word count grows past ~5000.
- **[Risk] Long-running warm exceeds Hobby function timeout (10 s)** → For ~1000 words and 500-row batches this is well under. Mitigation if we approach the limit: process one batch per invocation and let the cron resume on the next day, or move to Vercel Pro (60 s).

## Migration Plan

1. Ship the route + helper + `vercel.json` cron entry in one PR.
2. Verify `CRON_SECRET` is set in Vercel production env (it already should be).
3. After deploy, run once by hand:
   ```sh
   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
     https://<your-domain>/api/cache/warm
   ```
   Expect `{ warmed: <count>, batches: <n> }`.
4. Open Upstash console → Data Browser → confirm `word:*` keys exist.
5. Wait for the first cron run (next 03:00 UTC) and confirm Vercel logs show a 200 from `/api/cache/warm`.
6. Rollback = remove the cron entry from `vercel.json` and `git revert` the route. No DB or Redis state to undo (TTLs expire naturally).

## Open Questions

- None blocking. If the `words` table grows past ~5000 rows we should revisit batch size and consider differential warming.
