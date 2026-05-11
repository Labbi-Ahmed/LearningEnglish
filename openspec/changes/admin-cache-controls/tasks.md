## 1. Run-log helper

- [x] 1.1 Add `lastRunKey(kind: "words" | "users")` to `src/lib/cache/keys.ts` returning `cache:warm:last` or `cache:warm-users:last`
- [x] 1.2 Create `src/lib/cache/run-log.ts` exporting `RunLogEntry` type, `readLastRun(kind): Promise<RunLogEntry | null>` (uses `safeGet`), `writeLastRun(kind, actorId, result): Promise<void>` (uses `safeSet`, no TTL). `RunLogEntry = { ranAt: string; actorId: string; result: Record<string, unknown> }`
- [x] 1.3 Update `/api/cache/warm/route.ts` to call `writeLastRun("words", "cron", result)` after a successful run
- [x] 1.4 Update `/api/cache/warm-users/route.ts` to call `writeLastRun("users", "cron", result)` after a successful run

## 2. Admin endpoints

- [x] 2.1 Create `src/app/api/admin/cache/warm-words/route.ts` POST handler. Call `requireAuthor()`, return 503 if `redis === null`, acquire `cache:warm:lock` via `safeSetNxEx` (5-min TTL), run `warmWordCache()`, call `writeLastRun("words", user.id, result)`, return `{ ...result, ranAt, actorId }`, release lock in `finally`
- [x] 2.2 Create `src/app/api/admin/cache/warm-users/route.ts` POST handler. Same shape; lock key `cache:warm-users:lock` (10-min TTL); helper `warmActiveUserCaches()`; tag `"users"`
- [x] 2.3 On any thrown auth error, route through the existing `adminErrorResponse` helper from `src/lib/admin/handle-error.ts`
- [x] 2.4 If lock not acquired, return `{ already_running: true }` with HTTP 200 (same shape as the cron routes)

## 3. Sub-navigation

- [x] 3.1 Edit `src/app/(dashboard)/admin/layout.tsx` to render a small server-side `<nav>` with two links: "Users" → `/admin/users`, "Cache" → `/admin/cache`. Use `usePathname` only if a client wrapper is required; otherwise read the pathname server-side via `headers()` or pass the active key from each page

## 4. Admin cache page

- [x] 4.1 Create `src/app/(dashboard)/admin/cache/page.tsx` (server component). Call `requireAuthor()` (NotFound on failure mirrors the existing `/admin/users` behavior — handled by the layout already). Read both `readLastRun("words")` and `readLastRun("users")`. Pass them to a client component
- [x] 4.2 Create `src/app/(dashboard)/admin/cache/cache-panel.tsx` client component. Two `WarmPanel` blocks side-by-side on desktop, stacked on mobile. Each renders: title, description, last-run line (`ranAt` + `actorId` + JSON-stringified result), and a button. Uses `useMutation` to POST; on success, refetches the last-run via a small `GET /api/admin/cache/last-run?kind=...` helper OR re-renders by triggering `router.refresh()`
- [x] 4.3 Create `GET /api/admin/cache/last-run/route.ts` returning `{ words: RunLogEntry | null, users: RunLogEntry | null }` (author-only). Keeps the panel refresh logic simple
- [x] 4.4 Surface `{ already_running: true }` responses as an inline informational banner, not an error toast

## 5. Verification

- [x] 5.1 `npm run typecheck` passes
- [x] 5.2 `npm run lint` passes
- [ ] 5.3 Local smoke: as an author, visit `/admin/cache`; both panels render with "No run recorded yet" (or the prior cron result if any)
- [ ] 5.4 Local smoke: click "Warm dictionary"; expect a 200 response, panel updates with `actorId: <my-uuid>` and a fresh timestamp
- [ ] 5.5 Local smoke: click "Warm user caches"; same flow
- [ ] 5.6 Local smoke: click again immediately; expect `{ already_running: true }` (lock held) surfaced as a non-error notice
- [ ] 5.7 Local smoke: as a non-author signed-in user, visit `/admin/cache` — expect 404
- [ ] 5.8 Local smoke without Redis: visit the page — both panels render placeholders; clicking a button returns 503 surfaced as a notice
- [ ] 5.9 Upstash console check: after a successful warm, `cache:warm:last` and `cache:warm-users:last` exist with the expected JSON

## 6. Docs

- [x] 6.1 Add an "Admin controls" section to `docs/CACHING.md` describing `/admin/cache`, the two manual endpoints, and the last-run records
- [x] 6.2 Mention in `docs/ADMIN.md` that authors get a Cache sub-section in `/admin`
