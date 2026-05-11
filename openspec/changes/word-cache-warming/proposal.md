## Why

After a Vercel deploy or a Redis flush, the `word:*` cache is empty. The first lookup of every word pays the full Supabase roundtrip (`words` + `word_relations`) until enough lookups happen to warm the cache organically. We want a deliberate post-deploy / daily warming step so that every word already in the `words` table is reachable from Redis without any cold-DB read.

## What Changes

- Add `POST /api/cache/warm` — header-authenticated against `CRON_SECRET` (already in `env.ts`). Pages through the `words` table in batches, assembles each `CachedWord`, and `SET word:<slug>` with the same 24-hour TTL used by the runtime cache.
- Add a daily Vercel cron entry in `vercel.json` that hits the endpoint at 03:00 UTC.
- The endpoint is idempotent: running it twice in a row writes the same keys with refreshed TTLs.
- **Soft-fail respected**: if Upstash credentials are missing or unreachable the endpoint returns 503 with a clear message but does not crash; the cron will retry on the next schedule.
- The endpoint reuses `putWordInCache` from `src/lib/cache/word-cache.ts` so write semantics stay consistent with the runtime path.

## Capabilities

### New Capabilities
- `word-cache-warming`: cron-authenticated endpoint that hydrates the Redis `word:*` keys from the `words` table.

### Modified Capabilities
<!-- none -->

## Impact

- **Code**: new route `src/app/api/cache/warm/route.ts`; new helper `src/lib/cache/warm.ts` containing the paging + write loop (so it's unit-testable and callable from places other than HTTP if ever needed).
- **Config**: new `vercel.json` entry under `crons`.
- **DB**: no schema change.
- **Upstash usage**: one `SET` per word per run. With ~1000 words today, one daily run = ~1000 commands, comfortably within the 10K/day free tier.
- **Risk**:
  - Endpoint hit without `CRON_SECRET` → 401. The secret already exists in env.
  - Endpoint hammered → idempotent, but rate-limit by relying on cron schedule and a simple "only one warm at a time" guard via Redis lock (`NX` on `cache:warm:lock` with a 5-min TTL).
- **Out of scope**: warming `user:*:saved` sets (per-user; not worth the commands), warming `word_relations` separately (already inlined into `CachedWord`).
