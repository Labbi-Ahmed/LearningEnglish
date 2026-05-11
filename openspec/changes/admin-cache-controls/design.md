## Context

Two warming jobs exist today:
- `POST /api/cache/warm` (dictionary, calls `warmWordCache()` in `src/lib/cache/warm.ts`).
- `POST /api/cache/warm-users` (per-user caches, calls `warmActiveUserCaches()` in `src/lib/cache/warm-users.ts`).

Both authenticate via `Authorization: Bearer ${CRON_SECRET}`. This works for Vercel cron and `curl` but is awkward to expose to a browser: the secret would have to ride in client JS, which is wrong.

The admin surface from `admin-delete-deactivate-user` already gates routes by `requireAuthor()` (`src/lib/auth/require-author.ts`). The user-management UI lives at `/admin/users`. We're adding a sibling surface for cache operations.

Single-flight locks are already in place at `cache:warm:lock` (5 min) and `cache:warm-users:lock` (10 min). A browser-triggered run that races a cron simply gets `{ already_running: true }` — the existing contract.

## Goals / Non-Goals

**Goals:**
- Author-only browser UI to trigger both warm jobs on demand.
- Show the last run's result + timestamp + actor (cron vs which admin) for each job.
- Reuse the existing helpers verbatim; no duplicate logic.
- Both admin and cron paths write to the same "last run" record so the UI reflects scheduled runs too.

**Non-Goals:**
- Recent-runs history beyond the last entry.
- Cache flush / wipe controls.
- Per-user cache inspection or invalidation tools.
- Server-Sent-Event progress streaming during a run; we return the final result only.
- Public observability dashboards.

## Decisions

### 1. Two parallel endpoints, not a query-param toggle
Separate routes `/api/admin/cache/warm-words` and `/api/admin/cache/warm-users` make the surface obvious in the codebase and the network panel. Each is < 30 LOC. A combined `?kind=words` style was considered and rejected — saves nothing and makes auth audit harder.

### 2. Reuse helpers, not the cron routes
The admin routes import `warmWordCache` / `warmActiveUserCaches` directly. The cron routes (which check `CRON_SECRET`) stay untouched. This keeps the two trust boundaries cleanly separated: cron secret for Vercel; session for browsers.

### 3. Shared single-flight locks
The admin routes acquire the SAME lock keys as the crons (`cache:warm:lock`, `cache:warm-users:lock`). If a cron is mid-flight, an admin click gets `{ already_running: true }` — and vice-versa. No need for a separate "admin lock".

### 4. Last-run record stored in Redis
After each successful run, the route writes a JSON value at `cache:warm:last` or `cache:warm-users:last`:
```ts
{
  ranAt: "2026-05-11T07:34:12Z",
  actorId: "uuid-or-cron",
  result: { warmed?: N, refreshed?: N, batches: B }
}
```
No TTL. The next run overwrites it. Reads on the admin page tolerate `null` (no run ever recorded).
- **Why Redis, not the DB**: keeps the cache layer self-contained, no schema, and the data is already ephemeral by nature.
- **Why no TTL**: one record per kind, ~200 bytes — never grows.

### 5. Cron routes also write the last-run record
Tiny edit to `/api/cache/warm/route.ts` and `/api/cache/warm-users/route.ts`: after the helper returns success, call `writeLastRun("words"|"users", result, "cron")`. Without this the UI would always show "no recent run" the day after a deploy.

### 6. Author authz via existing helper
Both admin endpoints call `requireAuthor()` (throws `UnauthorizedError`/`ForbiddenError`). Errors are mapped through the existing `adminErrorResponse` helper.

### 7. Self-target prevention is N/A
Cache warming isn't a "destructive action on another user." No typed-confirmation needed. The buttons just show a loading state and the result.

### 8. Sub-nav inside /admin
A small `<nav>` at the top of `(dashboard)/admin/layout.tsx` lists "Users", "Cache". Server-rendered, no client component needed.

## Risks / Trade-offs

- **[Risk] Browser-triggered run blocks for ≥10s and the request times out** → Mitigation: helpers already paginate (500 words / 50 users per batch). Hobby tier 10s timeout is enough for the current scale. If it ever isn't, the run still completes server-side; the lock prevents overlap; the next refresh of `/admin/cache` shows the eventual result.
- **[Risk] An admin spam-clicks the button** → Mitigation: lock acquisition fails fast on the second click; the response says `already_running`.
- **[Risk] `cache:*:last` becomes stale on a Redis reset** → Acceptable. UI degrades gracefully ("no run recorded yet"); next run rewrites it.
- **[Trade-off] No history of past runs** → Conscious choice. One record per job is enough to answer "did it run today?" Anything richer belongs in a separate observability change.

## Migration Plan

1. Ship the new helper, two endpoints, page, sub-nav, and cron edits in one PR.
2. After deploy, sign in as an author, visit `/admin/cache`, click "Warm dictionary" — confirm 200 + the result appears + the next page refresh shows the timestamp.
3. Repeat with "Warm user caches".
4. Verify in Upstash console: `cache:warm:last`, `cache:warm-users:last` exist with the JSON shape above.
5. Rollback = `git revert`. No DB or schema state.

## Open Questions

- Should the admin endpoints also accept the existing `CRON_SECRET` header as an alternate auth, so power users can still curl the admin route directly? Default: **no** — that's what `/api/cache/warm*` is for.
