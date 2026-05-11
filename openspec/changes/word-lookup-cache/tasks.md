## 1. Dependency and config

- [x] 1.1 `npm install @upstash/redis`
- [x] 1.2 Extend the Zod env schema in `src/lib/env.ts` with optional `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- [x] 1.3 Documented inline in `src/lib/env.ts` (project has no `.env.example` file)

## 2. Cache infrastructure

- [x] 2.1 Create `src/lib/cache/keys.ts` with `wordKey(slug)` and `savedSetKey(userId)` exports (lowercases the slug)
- [x] 2.2 Create `src/lib/cache/redis.ts` with `import "server-only"`. Read env vars; if either is missing export `redis = null`. Provide null-safe wrappers: `safeGet`, `safeSet` (accepts TTL), `safeSadd`, `safeSrem`, `safeSismember`, `safeSmembers`, `safeExists`, `safeExpire`. Every wrapper logs `[cache:redis]` and returns `null`/`false` on missing client or thrown error
- [x] 2.3 Create `src/lib/cache/word-cache.ts` with `getWordFromCache(slug)` returning `CachedWord | null`, and `putWordInCache(slug, value)` setting a 24-hour TTL
- [x] 2.4 Create `src/lib/cache/saved-set.ts` with `isWordSavedCached(userId, wordId)` (returns `boolean | null` where `null` means "set not hydrated"), `addToSavedCache(userId, wordId)`, `removeFromSavedCache(userId, wordId)`, and `hydrateSavedSet(userId, wordIds)` (sadd + 7-day expire)

## 3. Wire word cache into `upsertWordFromDictionary`

- [x] 3.1 At the top of `upsertWordFromDictionary` in `src/lib/dictionary.ts`, call `getWordFromCache(word)`; on hit, return immediately
- [x] 3.2 At the end of the DB-hit branch, call `putWordInCache(word, result)` before returning
- [x] 3.3 At the end of the fresh-insert branch, call `putWordInCache(word, result)` before returning

## 4. Wire saved-set cache into routes

- [x] 4.1 In `GET /api/words/[word]/route.ts`, replace the COUNT-against-`user_words` with `isWordSavedCached(user.id, cached.id)`. If the helper returns `null` (set not hydrated), do the existing COUNT for this request AND kick off `hydrateSavedSet(user.id, ...)` populated by `SELECT word_id FROM user_words WHERE user_id=?`. Do not await the hydrate
- [x] 4.2 In `POST /api/words/save/route.ts`, after the successful INSERT into `user_words`, call `addToSavedCache(user.id, word_id)`
- [x] 4.3 In `DELETE /api/words/[word]/route.ts`, after the successful DELETE, look up the deleted row's `word_id` (or accept it as a query param if the delete signature allows), then call `removeFromSavedCache(user.id, word_id)`. If `word_id` is not available post-delete, fetch it before the delete and use it afterward

## 5. Client staleTime

- [x] 5.1 In `src/app/(dashboard)/vocabulary/vocabulary-search.tsx`, on the `useQuery` keyed by `["word", activeWord]`, add `staleTime: 24 * 60 * 60 * 1000` and `gcTime: 24 * 60 * 60 * 1000`

## 6. Verification

- [x] 6.1 `npm run typecheck` passes
- [x] 6.2 `npm run lint` passes
- [ ] 6.3 Local smoke without Redis env vars: look up a word, save, unsave — every flow works (cache is silent no-op). Check console for one warning per cache call describing the missing env (or silent — TBD)
- [ ] 6.4 Local smoke with Upstash dev creds: look up `hello` twice; second time `word:hello` exists in Upstash console and the route logs no DB SELECT in dev DB logs
- [ ] 6.5 Local smoke with creds: save `hello`, refresh `/vocabulary`, confirm `user:<uuid>:saved` contains the word id and the route used `sismember`
- [ ] 6.6 Local smoke: unsave `hello`, confirm Redis set no longer contains the id
- [ ] 6.7 Local smoke: kill Upstash creds mid-session (rotate token in env), reload — UI continues to work and console shows `[cache:redis]` warnings

## 7. Docs

- [x] 7.1 Add a short section to `CLAUDE.md` (free-tier discipline) documenting Upstash usage and the soft-fail contract
- [x] 7.2 Add `docs/CACHING.md` summarizing key shapes (`word:*`, `user:*:saved`), TTLs, invalidation rules, and how to inspect the cache via the Upstash console
