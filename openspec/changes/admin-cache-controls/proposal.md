## Why

The Redis cache layer (`word:*`, `user:*:saved`, `user:*:words:list`) has two daily Vercel crons that warm it — and right now the only way to run them on demand is `curl` with the `CRON_SECRET`. Authors don't have a browser-based way to:

- Warm the dictionary cache after a deploy.
- Re-hydrate per-user caches without waiting for 03:30 UTC.
- See whether the cron actually ran last night.

A small admin surface fixes this: two buttons, each shows the last run's result and timestamp. Same `requireAuthor()` gate as `/admin/users`, no `CRON_SECRET` exposure to the browser.

## What Changes

- New admin page `/admin/cache` with two action panels:
  - **Warm dictionary** → POSTs `/api/admin/cache/warm-words`, shows `{ warmed, batches }` and when it last ran.
  - **Warm user caches** → POSTs `/api/admin/cache/warm-users`, shows `{ refreshed, batches }` and when it last ran.
- New admin endpoints `POST /api/admin/cache/warm-words` and `POST /api/admin/cache/warm-users` — gated by `requireAuthor()`, NOT `CRON_SECRET`. They reuse the existing helpers `warmWordCache()` (`src/lib/cache/warm.ts`) and `warmActiveUserCaches()` (`src/lib/cache/warm-users.ts`).
- Share the same single-flight Redis locks as the cron endpoints so a manual trigger can't overlap a cron run (or another admin's click).
- Persist each run's result + timestamp + actor id at Redis keys `cache:warm:last` and `cache:warm-users:last` (JSON, no TTL); the admin page reads these to render the last-run panels.
- Add a sub-nav inside `/admin` ("Users", "Cache") so the surface stays organized.
- Gate the existing admin link in the dashboard nav so it points at `/admin/users` by default; the layout already shows it only to authors.

## Capabilities

### New Capabilities
- `admin-cache-controls`: author-only UI + endpoints to trigger and observe the Redis cache warming jobs.

### Modified Capabilities
<!-- none — cron endpoints stay as-is -->

## Impact

- **Code**:
  - New: `src/app/(dashboard)/admin/cache/page.tsx` (server component) + `cache-panel.tsx` (client component with the two buttons and last-run displays).
  - New: `src/app/api/admin/cache/warm-words/route.ts`, `src/app/api/admin/cache/warm-users/route.ts`.
  - New: `src/lib/cache/run-log.ts` with `readLastRun(kind)` and `writeLastRun(kind, result, actorId)`.
  - Extend `src/lib/cache/keys.ts` with `lastRunKey(kind)` helper.
  - Existing cron routes (`/api/cache/warm`, `/api/cache/warm-users`) updated to also write to `cache:*:last` so the admin page reflects scheduled runs, not only manual ones.
  - Tiny sub-nav update in `src/app/(dashboard)/admin/layout.tsx`.
- **DB**: no schema change.
- **Upstash usage**: two extra `SET` commands per warm run (one for each cron writing its last-run metadata). Negligible.
- **Risk**: low. Author-only authz reused from `/admin/users`. Same single-flight locks bound concurrency. Soft-fail still works — if Redis is down, the buttons return 503 with the existing message.
- **Out of scope**: cache flush / clear endpoints, recent-runs history (last 20 only), per-user invalidation tools, metrics dashboards.
