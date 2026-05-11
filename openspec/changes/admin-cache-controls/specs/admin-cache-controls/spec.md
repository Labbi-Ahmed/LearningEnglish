## ADDED Requirements

### Requirement: Author-only cache admin endpoints
The system SHALL expose `POST /api/admin/cache/warm-words` and `POST /api/admin/cache/warm-users`. Both endpoints SHALL authenticate via `requireAuthor()` (session-based author check) and MUST NOT accept `CRON_SECRET` as an alternate credential.

#### Scenario: Author calls warm-words
- **WHEN** an author POSTs to `/api/admin/cache/warm-words`
- **THEN** the endpoint runs `warmWordCache()` under the shared `cache:warm:lock` and returns HTTP 200 with `{ warmed, batches, ranAt, actorId }`

#### Scenario: Author calls warm-users
- **WHEN** an author POSTs to `/api/admin/cache/warm-users`
- **THEN** the endpoint runs `warmActiveUserCaches()` under the shared `cache:warm-users:lock` and returns HTTP 200 with `{ refreshed, batches, ranAt, actorId }`

#### Scenario: Non-author calls
- **WHEN** a signed-in user without `tier='author'` POSTs to either endpoint
- **THEN** the response is HTTP 403 and no work is performed

#### Scenario: Anonymous call
- **WHEN** an unauthenticated POST hits either endpoint
- **THEN** the response is HTTP 401

#### Scenario: Lock already held
- **WHEN** a cron (or another admin) is mid-run and an admin click arrives
- **THEN** the endpoint returns HTTP 200 with `{ already_running: true }` and performs no work

### Requirement: Last-run record
On every successful warm run — whether triggered by cron or by an admin — the system SHALL write a JSON record to Redis at the appropriate key: `cache:warm:last` for the dictionary job, `cache:warm-users:last` for the per-user job. The record SHALL contain `ranAt` (ISO 8601 UTC), `actorId` (the user id, or the literal string `"cron"` for scheduled runs), and `result` (the helper's return object). The record SHALL NOT have a TTL.

#### Scenario: Cron run writes record
- **WHEN** the daily cron route completes a successful warm
- **THEN** the corresponding `cache:*:last` key is overwritten with `actorId: "cron"`

#### Scenario: Admin run writes record
- **WHEN** an admin run completes successfully
- **THEN** the corresponding `cache:*:last` key is overwritten with `actorId` set to the admin's user id

#### Scenario: Reading a never-run record
- **WHEN** the admin page reads `cache:*:last` and no run has ever been recorded
- **THEN** the read returns `null` and the UI renders "No run recorded yet"

### Requirement: Admin cache page
The system SHALL expose a server-rendered page at `/admin/cache`. The page SHALL be gated by the same author check as `/admin/users` (404 for non-authors). It SHALL render two panels — one per warm job — each containing a button to trigger the job and a display of the last-run record.

#### Scenario: Author opens the page
- **WHEN** an author navigates to `/admin/cache`
- **THEN** the page renders two panels and reads both `cache:*:last` records server-side; the displayed timestamps and results match what's in Redis

#### Scenario: Non-author opens the page
- **WHEN** a non-author navigates to `/admin/cache`
- **THEN** the server returns 404 (matching the existing `/admin` non-enumerability behavior)

#### Scenario: Run button success
- **WHEN** an author clicks "Warm dictionary"
- **THEN** the client POSTs to `/api/admin/cache/warm-words`, displays the response inline, and re-fetches the last-run record so the panel updates without a full page reload

#### Scenario: Run button while lock held
- **WHEN** an author clicks a button and the response is `{ already_running: true }`
- **THEN** the UI surfaces "Another run is in progress" without an error toast and leaves the last-run panel unchanged

### Requirement: Sub-navigation inside /admin
The system SHALL add a server-rendered sub-navigation inside `/admin` listing at minimum two links: "Users" → `/admin/users`, "Cache" → `/admin/cache`. The sub-nav SHALL highlight the current section.

#### Scenario: Author on /admin/users
- **WHEN** an author is on `/admin/users`
- **THEN** the sub-nav shows "Users" as the active link

#### Scenario: Author on /admin/cache
- **WHEN** an author is on `/admin/cache`
- **THEN** the sub-nav shows "Cache" as the active link

### Requirement: Soft-fail behavior preserved
If Redis is unconfigured or unreachable, the admin endpoints SHALL return HTTP 503 with `{ error: "cache_unavailable" }` (matching the cron behavior). The admin page MUST still render even when last-run reads return `null`.

#### Scenario: Redis unavailable
- **WHEN** an author clicks a button with Redis unreachable
- **THEN** the response is HTTP 503 with `{ error: "cache_unavailable" }` and the UI surfaces a non-error notice ("Cache is not configured")

#### Scenario: Page render with no Redis
- **WHEN** an author opens `/admin/cache` and Redis reads return `null`
- **THEN** the page renders both panels with "No run recorded yet" placeholders
