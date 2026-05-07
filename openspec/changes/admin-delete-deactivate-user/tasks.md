## 1. Database migration

- [x] 1.1 Create `supabase/migrations/0022_admin_audit_and_active.sql` adding `profiles.is_active boolean not null default true`
- [x] 1.2 In the same migration, create `admin_audit_log` (id uuid pk, actor_id uuid, target_id uuid (no FK), action text check in `('deactivate','reactivate','delete')`, reason text, metadata jsonb, created_at timestamptz default now())
- [x] 1.3 Enable RLS on `admin_audit_log`; add SELECT policy for `tier='author'` users; no INSERT/UPDATE/DELETE policies (service role only)
- [x] 1.4 Add index `admin_audit_log (created_at desc)` and `admin_audit_log (target_id)`
- [x] 1.5 Add a comment block in the migration enumerating all per-user tables that cascade from `auth.users`/`profiles`, plus a verify query
- [x] 1.6 Update `supabase/migrations/README.md` with a reminder: any new per-user table MUST cascade from `auth.users(id)` or `profiles(id)`
- [ ] 1.7 Apply migration locally and confirm `select count(*) from admin_audit_log` returns 0 and `\d profiles` shows `is_active`

## 2. Server helpers

- [x] 2.1 Add `requireAuthor()` server helper in `src/lib/auth/require-author.ts` returning `{ user, supabase, supabaseAdmin }` or throwing typed `UnauthorizedError`/`ForbiddenError`; checks session AND `user_subscriptions.tier = 'author'`
- [x] 2.2 Extend the existing auth/middleware (or server-side guard used by API routes) to reject any request whose `profiles.is_active = false` with HTTP 403 and a generic "account suspended" payload
- [x] 2.3 Add a `writeAuditLog(actorId, targetId, action, reason?, metadata?)` helper that throws if the insert fails (used to abort destructive routes)
- [x] 2.4 Add helper `assertNotLastActiveAuthor(targetId)` that runs the count query and throws 409 when violated
- [x] 2.5 Add helper `deleteUserStorage(userId)` that lists and deletes everything under `speaking/<userId>/` and `avatars/<userId>/` and throws on partial failure

## 3. Zod schemas

- [x] 3.1 Create `src/lib/schemas/admin.ts` with `deleteUserBodySchema` (`reason: z.string().min(1).max(500)`) and `deactivateUserBodySchema` (`reason: z.string().max(500).optional()`)
- [x] 3.2 Export inferred types `DeleteUserBody` and `DeactivateUserBody`

## 4. API routes

- [x] 4.1 Create `POST src/app/api/admin/users/[id]/deactivate/route.ts` — `requireAuthor()`, parse body, reject self-target (400), reject last-author (409), write audit, set `is_active=false`, call `supabaseAdmin.auth.admin.signOut(targetId)`
- [x] 4.2 Create `POST src/app/api/admin/users/[id]/reactivate/route.ts` — `requireAuthor()`, idempotent: if already active return 200 with `{noop:true}`; else write audit, set `is_active=true`
- [x] 4.3 Create `DELETE src/app/api/admin/users/[id]/route.ts` — `requireAuthor()`, validate body, reject self-target (400), reject last-author (409), write audit, call `deleteUserStorage(targetId)`, then `supabaseAdmin.auth.admin.deleteUser(targetId)`; return 500 if any step fails after audit
- [x] 4.4 Create `GET src/app/api/admin/users/route.ts` — `requireAuthor()`, query params `?q=<email-substring>&page=<n>&pageSize=<n>` (cap pageSize at 50), join `auth.users` (admin client), `profiles`, `user_subscriptions`; return `{ users, page, totalPages }`

## 5. Admin UI

- [x] 5.1 Create `src/app/(dashboard)/admin/layout.tsx` (server component) that calls `requireAuthor()`; on failure, return Next 404 (not 403, to keep author surface non-enumerable)
- [x] 5.2 Create `src/app/(dashboard)/admin/users/page.tsx` (server component) that fetches the first page of users via the GET route helper directly (server-side) and renders a table
- [x] 5.3 Create client component (rolled into `users-table.tsx`) with Deactivate / Reactivate / Delete buttons; uses TanStack Query mutations against the admin API routes
- [x] 5.4 Create `DeleteUserDialog.tsx` requiring the operator to type the target's email exactly; only enables the destructive button on match; prompts for required `reason`
- [x] 5.5 Create `DeactivateUserDialog.tsx` with single-click confirm and optional reason
- [x] 5.6 Add a search input that issues GET with `?q=` and re-renders the table
- [x] 5.7 Surface success/error feedback (inline flash banner since the project has no toast library); on success, invalidate the user-list query

## 6. Navigation gating

- [x] 6.1 In the dashboard nav, conditionally render an "Admin" link when the current user has `tier='author'` (server-rendered, no client-only check)
- [x] 6.2 Confirm via grep that no other place renders an admin link unconditionally

## 7. Tests / smoke

- [ ] 7.1 Manual smoke: with a non-author session, verify `/admin/users` returns 404 and all four API routes return 401/403
- [ ] 7.2 Manual smoke: as author, deactivate a throwaway user → confirm they cannot reach a protected page; reactivate → confirm access restored
- [ ] 7.3 Manual smoke: as author, delete a throwaway user → verify in SQL: `auth.users` row gone, `profiles/user_words/game_sessions/lesson_progress/speaking_recordings/ai_conversations/user_xp_events/user_badges/push_subscriptions/user_subscriptions/daily_usage/plan_events` rows gone for that id, `words` and `word_relations` row counts UNCHANGED, `speaking/<id>/` and `avatars/<id>/` empty, audit row present
- [ ] 7.4 Manual smoke: try to delete self → 400; try to deactivate the only remaining active author → 409

## 8. Docs and ship

- [x] 8.1 Update `docs/SUBSCRIPTIONS.md` with a pointer to admin tooling; add `docs/ADMIN.md` describing the surface
- [x] 8.2 `docs/ADMIN.md` documents how to promote a new author via service-role SQL
- [x] 8.3 Run `npm run lint && npm run typecheck` — both pass
- [ ] 8.4 Open PR `feature/admin-user-management` against `develop` with a screencast of the three flows
