## 1. Warming helper

- [x] 1.1 Create `src/lib/cache/warm.ts` exporting `warmWordCache(): Promise<{ warmed: number; batches: number }>` that uses the admin Supabase client and `putWordInCache`
- [x] 1.2 Inside `warmWordCache`, page `words` rows 500 at a time via `.range(from, from+499)` until a partial/empty page is returned
- [x] 1.3 For each batch, run a single `select related_text, related_text_bn, relation_type, word_id from word_relations where word_id in (...)` and group rows by `word_id`
- [x] 1.4 Assemble each `CachedWord` (mirroring the cache-hit branch of `upsertWordFromDictionary` so the shape is identical) and call `putWordInCache(word, value)`
- [x] 1.5 Return `{ warmed, batches }`

## 2. Single-flight lock

- [x] 2.1 In `src/lib/cache/redis.ts`, add `safeSetNxEx(key, value, ttlSeconds): Promise<boolean>` that returns `true` when the lock was acquired and `false` otherwise. Null client → `false` (caller should treat as "no lock available; do not run")
- [x] 2.2 Add `safeDel(key): Promise<void>` for releasing the lock

## 3. API route

- [x] 3.1 Create `src/app/api/cache/warm/route.ts` with `POST` handler
- [x] 3.2 Compare the `Authorization: Bearer …` header against `env.CRON_SECRET`. If `CRON_SECRET` is missing in env, return 503; if the header is absent or mismatched, return 401
- [x] 3.3 If `redis === null` from `src/lib/cache/redis.ts`, return 503 with `{ error: "cache_unavailable" }`
- [x] 3.4 Acquire `cache:warm:lock` via `safeSetNxEx` (5-minute TTL). If not acquired, return 200 `{ already_running: true }`
- [x] 3.5 Call `warmWordCache()`, then `safeDel("cache:warm:lock")` in a `finally`
- [x] 3.6 Return 200 `{ warmed, batches }`

## 4. Vercel cron

- [x] 4.1 Create or extend `vercel.json` with a `crons` array: `[{ "path": "/api/cache/warm", "schedule": "0 3 * * *" }]`
- [x] 4.2 Document in `docs/CACHING.md` that the cron sends the `Authorization` header automatically when `CRON_SECRET` is set as a Vercel env var, per Vercel's cron docs

## 5. Verification

- [x] 5.1 `npm run typecheck` passes
- [x] 5.2 `npm run lint` passes
- [ ] 5.3 Local smoke: with valid Upstash creds and `CRON_SECRET` set, run `curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cache/warm` — expect 200 with non-zero `warmed`
- [ ] 5.4 Local smoke: re-run the curl immediately — expect `{ already_running: true }` (lock held) OR a second successful warm if the first finished within the lock TTL
- [ ] 5.5 Local smoke: run without the header — expect 401
- [ ] 5.6 Local smoke: temporarily unset `UPSTASH_REDIS_REST_URL`, re-run — expect 503 `{ error: "cache_unavailable" }`
- [ ] 5.7 Upstash console check: after a successful warm, `word:<any-known-slug>` exists with a TTL in the range 86000-86400 seconds

## 6. Docs and ship

- [x] 6.1 Update `docs/CACHING.md` with the warm endpoint, cron schedule, and curl example
- [ ] 6.2 Confirm `CRON_SECRET` is set in Vercel project env (Production + Preview if you want cron to hit Preview too — usually no)
- [ ] 6.3 After deploy, run the curl once manually to warm the new prod cache immediately rather than waiting for 03:00 UTC
