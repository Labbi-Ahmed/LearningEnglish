## ADDED Requirements

### Requirement: Cache warming endpoint
The system SHALL expose `POST /api/cache/warm`. The endpoint SHALL authenticate the caller by comparing the `Authorization: Bearer <token>` header against `process.env.CRON_SECRET`. On success it SHALL page through the `words` table and write each row to Redis under `word:<slug>` using the same shape and 24-hour TTL as the runtime cache.

#### Scenario: Authorized warm
- **WHEN** `POST /api/cache/warm` is called with `Authorization: Bearer <valid-cron-secret>`
- **THEN** the endpoint returns HTTP 200 with a JSON body `{ warmed: N, batches: B }` and `word:*` keys for every row in `words` exist in Redis with a 24-hour TTL

#### Scenario: Missing or wrong secret
- **WHEN** the header is absent or the token does not match `CRON_SECRET`
- **THEN** the endpoint returns HTTP 401 and writes nothing

#### Scenario: Idempotent run
- **WHEN** the endpoint is called twice in a row, with no DB changes between calls
- **THEN** both calls return success and the second call refreshes each key's TTL without changing the values

### Requirement: Single-flight lock
The endpoint SHALL acquire a Redis lock at `cache:warm:lock` via `SET NX EX 300` before starting the warming loop. If the lock is already held, the endpoint SHALL return HTTP 200 with `{ already_running: true }` and do nothing else.

#### Scenario: Concurrent invocation
- **WHEN** two warm requests arrive within seconds of each other
- **THEN** the first acquires the lock and runs the loop; the second returns `{ already_running: true }` immediately

#### Scenario: Lock self-expires
- **WHEN** the warming process crashes before releasing the lock
- **THEN** the 5-minute TTL clears it, and the next scheduled run succeeds

### Requirement: Reuses runtime write helpers
The endpoint MUST NOT call Redis primitives directly. Every cache write SHALL go through `putWordInCache` (`src/lib/cache/word-cache.ts`) so that TTL and key shape stay synchronized with the runtime path.

#### Scenario: TTL parity
- **WHEN** a TTL change is made in `putWordInCache`
- **THEN** the warming endpoint picks it up automatically without code changes to the warm route

### Requirement: Soft-fail visibility
When Upstash credentials are missing or unreachable, the endpoint SHALL return HTTP 503 with `{ error: "cache_unavailable" }`. The runtime caching path SHALL remain soft-fail (logs only).

#### Scenario: Upstash unreachable during warm
- **WHEN** the warming endpoint runs with valid auth but no working Redis
- **THEN** the response is HTTP 503 with `{ error: "cache_unavailable" }`, and Vercel cron logs surface the failure

#### Scenario: Upstash unreachable at lookup time
- **WHEN** a normal `GET /api/words/<word>` request runs with no working Redis
- **THEN** the route falls through to the DB as today and returns HTTP 200

### Requirement: Daily Vercel cron
The project SHALL include a `vercel.json` `crons` entry that calls `POST /api/cache/warm` once per day at 03:00 UTC. The cron SHALL forward the `Authorization: Bearer <CRON_SECRET>` header.

#### Scenario: Scheduled invocation
- **WHEN** Vercel triggers the daily cron
- **THEN** the cache-warming endpoint runs and Vercel logs show a 200 response (or a 503 to surface a Redis outage)

### Requirement: Bounded batches
The endpoint SHALL read `words` rows 500 at a time using `range(from, to)` pagination and SHALL fetch the corresponding `word_relations` per batch with one `IN (...)` query. The endpoint MUST NOT load the entire `words` table into memory in a single query.

#### Scenario: 1500 words
- **WHEN** the `words` table contains 1500 rows and the endpoint runs
- **THEN** three batches of 500 rows are processed and the response reports `batches: 3, warmed: 1500`
