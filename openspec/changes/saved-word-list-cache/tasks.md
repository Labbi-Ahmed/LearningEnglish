## 1. Cache helper

- [x] 1.1 Add `savedListKey(userId)` to `src/lib/cache/keys.ts`
- [x] 1.2 Create `src/lib/cache/saved-list.ts` with `SavedListEntry` type and helpers `getSavedListFromCache(userId): Promise<SavedListEntry[] | null>`, `putSavedListInCache(userId, entries)` (7-day TTL, hard-cap at 5000 entries — over-cap is a no-op with a `[cache:saved-list]` warning), `invalidateSavedList(userId)`
- [x] 1.3 Make `putSavedListInCache` use `safeSet` with the 7-day TTL; make `invalidateSavedList` use `safeDel`
- [x] 1.4 Add `hydrateUserCachesAfterSignIn(userId)` to the same module: one DB query for the full SavedListEntry shape, then `putSavedListInCache` + `hydrateSavedSet`. Safe to call without awaiting. Swallows errors after logging with `[cache:saved-list]`

## 2. Wire into `GET /api/words`

- [x] 2.1 In `src/app/api/words/route.ts`, before the existing Supabase query, call `getSavedListFromCache(user.id)`
- [x] 2.2 If hit: filter the array by `q` substring (case-insensitive) when present, slice with `offset`/`limit`, compute `nextOffset` the same way as today, return the same JSON shape — no DB call
- [x] 2.3 If miss: run a *full* DB query for the user (no `q`, no pagination) selecting the SavedListEntry shape ordered by `created_at desc`. Call `putSavedListInCache(user.id, fullList)` and `hydrateSavedSet(user.id, ids)`. Then filter + slice in Node and return
- [x] 2.4 Wrap the whole cache path in try/catch — on any thrown error, fall through to the existing single-query DB path and log `[cache:saved-list]`

## 3. Invalidate on writes

- [x] 3.1 In `src/app/api/words/save/route.ts`, after the successful `user_words` upsert, call `invalidateSavedList(user.id)` (in addition to the existing `addToSavedCache`)
- [x] 3.2 In `src/app/api/words/[word]/route.ts` DELETE, after the successful delete, call `invalidateSavedList(user.id)` (in addition to the existing `removeFromSavedCache`)
- [x] 3.3 Confirm the review route does NOT invalidate (SM-2 fields are not in the cache payload)

## 4. Sign-in hydration hooks

- [x] 4.1 In `src/app/api/auth/callback/route.ts`, after `exchangeCodeForSession` succeeds and before the redirect, call `supabase.auth.getUser()` and then `void hydrateUserCachesAfterSignIn(user.id).catch(...)`
- [x] 4.2 In `src/app/(auth)/login/actions.ts:signInAction`, after `signInWithPassword` succeeds, fetch the user id from the response and call `void hydrateUserCachesAfterSignIn(user.id).catch(...)` before returning / redirecting
- [x] 4.3 Confirm neither call is awaited — the user redirect must not be delayed by Redis

## 5. Daily user-cache refresh cron

- [x] 5.1 Create `src/lib/cache/warm-users.ts` exporting `warmActiveUserCaches(): Promise<{ refreshed: number; batches: number }>` that selects `id` from `profiles` where `last_active_date >= now() - interval '14 days'`, processes in batches of 50, and per user runs the same DB query + cache writes as `hydrateUserCachesAfterSignIn`
- [x] 5.2 Create `src/app/api/cache/warm-users/route.ts` with GET + POST sharing a handler. Auth via `Authorization: Bearer ${env.CRON_SECRET}` exact-match. Returns 503 if Redis is unavailable. Single-flight lock `cache:warm-users:lock` (10-min TTL) via `safeSetNxEx`
- [x] 5.3 Add a `vercel.json` cron entry: `{ "path": "/api/cache/warm-users", "schedule": "30 3 * * *" }`

## 6. Verification

- [x] 6.1 `npm run typecheck` passes
- [x] 6.2 `npm run lint` passes
- [ ] 6.3 Local smoke without Redis creds: typeahead and list page work as today; no `[cache:saved-list]` errors in console
- [ ] 6.4 Local smoke with Redis: visit `/vocabulary`, confirm `user:<uuid>:words:list` appears in Upstash console with the expected entries
- [ ] 6.5 Local smoke: type a substring into the search; verify the DevTools Network response is correct AND the route logs no Supabase query (add a temporary `console.log` if needed to confirm cache hit; remove before commit)
- [ ] 6.6 Local smoke: save a new word, refresh `/vocabulary`, confirm the cached list contains the new entry and ordering is correct
- [ ] 6.7 Local smoke: unsave a word, confirm the cached list no longer contains it
- [ ] 6.8 Local smoke: sign out, sign back in (password or Google), confirm `user:<uuid>:words:list` and `user:<uuid>:saved` appear within a second or two of arriving on `/dashboard`
- [ ] 6.9 Local smoke: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cache/warm-users` — expect a 200 with non-zero `refreshed` (assuming you have active users)

## 7. Docs

- [x] 7.1 Update `docs/CACHING.md` keys table with `user:<id>:words:list` (type: JSON, TTL: 7d, contents: per-user saved-word display list)
- [x] 7.2 Add a "When the cache helps and when it doesn't" note: vocab list + typeahead are cached; review and dashboard are not
- [x] 7.3 Document the daily user-cache cron + sign-in hydration in `docs/CACHING.md` under a new "Per-user cache hydration" section