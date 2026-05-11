## ADDED Requirements

### Requirement: Per-user saved-list cache
The system SHALL cache each user's full saved-word list in Redis at `user:{userId}:words:list` as a JSON array of `SavedListEntry` objects ordered by `created_at desc`. Each entry SHALL include `id`, `word_id`, `word`, `pos`, `meaning`, `ipa_uk`, `ipa_us`, `created_at`. The TTL SHALL be 7 days.

#### Scenario: Hit
- **WHEN** `GET /api/words` is called and `user:{id}:words:list` exists
- **THEN** the route filters the cached array by the `q` substring (when present), applies `offset`/`limit` in-memory, and returns the same response shape as the DB path — without any Supabase query

#### Scenario: Miss
- **WHEN** `GET /api/words` is called and the cache is empty
- **THEN** the route runs the existing DB query for the user's full list (no `q`, no pagination), writes the full result to `user:{id}:words:list` with a 7-day TTL, then filters + paginates in Node and returns

#### Scenario: Response shape unchanged
- **WHEN** any response served from cache is compared to the equivalent DB-served response
- **THEN** the JSON body is identical (same field names, same values, same ordering, same `nextOffset` semantics)

### Requirement: Substring filtering in Node
The route SHALL perform substring matching in Node against the cached array when `q` is present, using `toLowerCase` on both the query and the entry's `word`. The match SHALL preserve the existing `ilike '%q%'` semantics (substring, case-insensitive).

#### Scenario: Substring match
- **WHEN** the cache holds `["hello", "shellfish", "world"]` and `q="ell"`
- **THEN** the response includes `"hello"` and `"shellfish"` and excludes `"world"`

#### Scenario: Empty q returns full list
- **WHEN** `q` is absent or empty
- **THEN** the route applies only `offset`/`limit` and returns the slice

### Requirement: Invalidation on membership change
Save and unsave routes SHALL invalidate `user:{userId}:words:list` after a successful DB mutation. SM-2 review updates SHALL NOT invalidate (they do not change cached fields).

#### Scenario: Save invalidates
- **WHEN** `POST /api/words/save` succeeds
- **THEN** the route calls `invalidateSavedList(userId)` after the DB insert; the next list read repopulates the cache from the DB

#### Scenario: Unsave invalidates
- **WHEN** `DELETE /api/words/[id]` succeeds
- **THEN** the route calls `invalidateSavedList(userId)` after the DB delete

#### Scenario: SM-2 review does not invalidate
- **WHEN** `POST /api/words/review` updates an entry's `ease`/`interval`/`next_review_at`
- **THEN** the cached list is NOT touched (none of those fields are stored in the cache)

### Requirement: Hard cap to bypass the cache for power users
If the DB result on a miss contains more than 5000 rows for a single user, the route SHALL skip the cache write, log `[cache:saved-list] over-cap user={userId} count=N`, and return the requested slice directly.

#### Scenario: Under cap
- **WHEN** a user has 4999 saved words and triggers a miss
- **THEN** the cache is populated with all 4999 entries and the response returns the requested slice

#### Scenario: Over cap
- **WHEN** a user has 5001 saved words and triggers a miss
- **THEN** the cache is NOT populated, a warning is logged, and the response returns the requested slice (served from the DB query results)

### Requirement: Opportunistic saved-id set hydration
When the saved-list cache miss runs the full DB query, the route SHALL also hydrate `user:{userId}:saved` from the same result (passing every `word_id`) so that subsequent `saved`-boolean checks in `GET /api/words/[word]` benefit.

#### Scenario: Cache miss hydrates both
- **WHEN** the list cache misses and the DB returns N rows
- **THEN** the route calls `putSavedListInCache(userId, rows)` AND `hydrateSavedSet(userId, wordIds)`

### Requirement: Soft-fail to DB
If Redis is unconfigured, unreachable, or any cache call throws, the route SHALL fall through to the existing Supabase query and return the same response as today. Errors SHALL be logged with prefix `[cache:saved-list]`.

#### Scenario: Redis unavailable
- **WHEN** `GET /api/words` runs with no working Redis
- **THEN** the route runs the existing DB query, returns HTTP 200 with the normal payload, and emits no cache write

### Requirement: Sign-in eager hydration
On a successful session creation, the system SHALL fire-and-forget a hydration that loads the user's full saved list into `user:{userId}:words:list` AND the user's `word_id` set into `user:{userId}:saved`. The hydration MUST NOT block the redirect response.

#### Scenario: OAuth sign-in
- **WHEN** the OAuth callback `GET /api/auth/callback` successfully exchanges the code for a session
- **THEN** the route schedules `hydrateUserCachesAfterSignIn(user.id)` without awaiting it and redirects to `/dashboard`

#### Scenario: Password sign-in
- **WHEN** the `signInAction` server action successfully signs the user in with `signInWithPassword`
- **THEN** the action schedules `hydrateUserCachesAfterSignIn(user.id)` without awaiting it and returns success / redirect

#### Scenario: Hydration error
- **WHEN** the background hydration throws (DB error, Redis error)
- **THEN** the error is caught and logged with prefix `[cache:saved-list]`; the user's sign-in is not affected

#### Scenario: Already-warm cache
- **WHEN** sign-in hydration runs for a user whose cache is already populated
- **THEN** the existing entries are overwritten with fresh values and the TTL is refreshed — no error

### Requirement: Daily user-cache refresh cron
The system SHALL expose `POST /api/cache/warm-users` authenticated by `Authorization: Bearer <CRON_SECRET>`. It SHALL refresh `user:{id}:words:list` and `user:{id}:saved` for every user whose `profiles.last_active_date` is within the last 14 days. A `vercel.json` cron SHALL invoke it daily at 03:30 UTC.

#### Scenario: Authorized run
- **WHEN** the endpoint is called with a valid `Authorization` header
- **THEN** it returns HTTP 200 with `{ refreshed: N, batches: B }` and both per-user caches exist for every active user

#### Scenario: Missing or wrong secret
- **WHEN** the header is absent or the token does not match `CRON_SECRET`
- **THEN** the endpoint returns HTTP 401 and writes nothing

#### Scenario: Concurrent invocations
- **WHEN** a second `warm-users` request arrives while the first is mid-flight
- **THEN** the second returns `{ already_running: true }` without performing work; the lock self-clears after 10 minutes

#### Scenario: Inactive users skipped
- **WHEN** a user's `last_active_date` is older than 14 days (or null)
- **THEN** that user is excluded from the refresh batch; their cache, if any, expires naturally via TTL

#### Scenario: Vercel cron invocation
- **WHEN** the daily cron fires at 03:30 UTC
- **THEN** Vercel calls `POST /api/cache/warm-users` with the configured `Authorization` header and Vercel logs show the 200 response

### Requirement: Centralized key helper
The list key SHALL be constructed via `savedListKey(userId)` exported from `src/lib/cache/keys.ts`. No route or helper outside `src/lib/cache/` SHALL build the key by string concatenation.

#### Scenario: New caller
- **WHEN** a future feature needs to invalidate the list cache
- **THEN** the developer imports `invalidateSavedList` from `src/lib/cache/saved-list.ts` rather than calling `redis.del` directly
