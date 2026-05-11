## ADDED Requirements

### Requirement: Redis client with soft-fail
The system SHALL configure an Upstash Redis client using `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` env vars. If either is absent, the client SHALL be `null` and every cache operation SHALL behave as a miss / no-op. Every Redis call SHALL be wrapped so that thrown errors are logged and treated as a miss / no-op rather than propagated to the user.

#### Scenario: Both env vars set
- **WHEN** the app boots with both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` present
- **THEN** the Redis client is instantiated and used by cache helpers

#### Scenario: Env vars missing
- **WHEN** either env var is missing
- **THEN** the client is `null`, all cache reads behave as miss, all cache writes are no-ops, and the route still returns its normal DB-backed response

#### Scenario: Redis call throws
- **WHEN** any cache operation throws (network error, auth failure, rate limit)
- **THEN** the error is logged with prefix `[cache:redis]` and the operation returns `null`/no-op; the calling route falls through to the DB path

### Requirement: Word dictionary data cached in Redis
The system SHALL cache the full `CachedWord` JSON in Redis keyed by `word:{slug}` whenever `upsertWordFromDictionary` returns successfully. Reads SHALL consult Redis before the `words` table. Each entry SHALL have a 24-hour TTL.

#### Scenario: Cache hit
- **WHEN** `upsertWordFromDictionary("hello")` is called and Redis contains `word:hello`
- **THEN** the cached value is returned without any Supabase query

#### Scenario: Cache miss, DB hit
- **WHEN** Redis does not contain `word:hello` and the `words` row exists
- **THEN** the function SELECTs from `words` + `word_relations`, returns the result, AND writes the assembled `CachedWord` to `word:hello` with a 24-hour TTL

#### Scenario: Cache miss, DB miss
- **WHEN** Redis does not contain `word:synesthesia` and the `words` row does not exist
- **THEN** the function calls the Free Dictionary API, inserts the new row, persists translations, AND writes the resulting `CachedWord` to `word:synesthesia` with a 24-hour TTL

#### Scenario: Redis unavailable, DB hit still returns
- **WHEN** Redis is misconfigured or down and the `words` row exists
- **THEN** the function reads from the DB exactly as today and returns the result (no `word:*` write happens, no error to the caller)

### Requirement: Per-user saved-word ID set cached in Redis
The system SHALL maintain a Redis Set at `user:{userId}:saved` containing the `word_id`s the user has saved. Membership checks SHALL prefer Redis. The set SHALL have a 7-day TTL and SHALL be hydrated from the `user_words` table on first miss.

#### Scenario: Membership check, Redis hit
- **WHEN** a route needs the `saved` boolean for `word_id` X and `user:{id}:saved` exists in Redis
- **THEN** the route uses `sismember` and skips the `user_words` COUNT

#### Scenario: Membership check, Redis miss → hydrate
- **WHEN** `user:{id}:saved` does not exist in Redis
- **THEN** the route returns the current request's `saved` value using the existing DB COUNT, AND asynchronously hydrates the full set from `SELECT word_id FROM user_words WHERE user_id=?` followed by `sadd`

#### Scenario: Save flow
- **WHEN** a save succeeds in the `user_words` table
- **THEN** the route calls `sadd("user:{id}:saved", word_id)` after the DB write; on Redis failure the response stays 200 and the cache self-heals on next miss

#### Scenario: Unsave flow
- **WHEN** a delete succeeds in `user_words`
- **THEN** the route calls `srem("user:{id}:saved", word_id)` after the DB write; on Redis failure the response stays 204 and the cache self-heals on next miss

#### Scenario: Set TTL
- **WHEN** the saved set is created via `sadd`
- **THEN** the route also issues `expire` so the key has a 7-day TTL

### Requirement: DB remains source of truth
The DB tables `words`, `word_relations`, and `user_words` SHALL remain the durable source of truth. The cache MUST NOT change which rows are written, when they are written, or the response shape returned to the client. All DB writes SHALL happen before the corresponding Redis update.

#### Scenario: New word still persists to DB
- **WHEN** a previously-unknown word is looked up
- **THEN** a row is inserted into `words` and any synonym/antonym rows into `word_relations`, exactly as before the cache existed

#### Scenario: Save still writes user_words first
- **WHEN** a save is processed
- **THEN** the `user_words` INSERT runs before the Redis `sadd`; a failure in the DB step aborts the request with the existing error, and Redis is not touched

#### Scenario: Response shape unchanged
- **WHEN** any response served from Redis is compared to a response served from the DB
- **THEN** the JSON body is byte-equivalent (same keys, same values)

### Requirement: Client-side staleTime on word lookup query
The TanStack Query in `vocabulary-search.tsx` keyed by `["word", activeWord]` SHALL set `staleTime` and `gcTime` to 24 hours so that re-rendering or re-mounting the page does not refetch a word already loaded in the same session.

#### Scenario: Re-mount within session
- **WHEN** a user looks up `"hello"`, navigates away, and returns within 24 hours
- **THEN** the cached response is returned and no network request is issued

#### Scenario: New browser session
- **WHEN** the user reloads or opens a new tab
- **THEN** the client cache is empty and the next lookup issues a request (which may still be served by Redis on the server)

### Requirement: Centralized cache keys
All Redis keys used by the app SHALL be constructed via helpers in `src/lib/cache/keys.ts`. No route or helper outside that module SHALL build a Redis key by string concatenation.

#### Scenario: Adding a new cached resource
- **WHEN** a future change wants to cache a new resource type
- **THEN** the developer adds a new exported helper in `keys.ts` rather than inlining a key string

### Requirement: Optional env var configuration
Two env vars SHALL be added to the env schema as optional strings: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. Absence of either SHALL NOT prevent boot; it only disables the cache.

#### Scenario: Boot without Redis configured
- **WHEN** the dev environment has no Upstash credentials
- **THEN** the app boots, all routes work, and the cache is silently a no-op

#### Scenario: Boot with Redis configured
- **WHEN** both env vars are present
- **THEN** the cache is active and is exercised by lookup / save / unsave flows
