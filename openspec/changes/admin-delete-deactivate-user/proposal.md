## Why

There is currently no way for an author (admin) to remove or suspend a problem account. Spam signups, abusive behavior, or user-requested data erasure can only be handled by hand-running SQL via the Supabase service role, which is slow and error-prone. We need a safe, auditable, in-app way for an author to deactivate or hard-delete a user — while preserving the global `words` cache that the free-tier discipline depends on.

## What Changes

- Introduce an admin surface (only accessible to users with `user_subscriptions.tier = 'author'`) for managing accounts.
- Add `profiles.is_active boolean default true`. When false, the user is signed out, blocked from sign-in, and hidden from public surfaces (leaderboard, etc.).
- Add admin API routes:
  - `POST /api/admin/users/[id]/deactivate` → sets `is_active = false`, signs the user out.
  - `POST /api/admin/users/[id]/reactivate` → sets `is_active = true`.
  - `DELETE /api/admin/users/[id]` → hard-deletes the auth user; cascades wipe all per-user data (profile, user_words, game_sessions, lesson_progress, speaking_recordings, ai_conversations, user_xp_events, user_badges, push_subscriptions, user_subscriptions, daily_usage, plan_events). The shared `words` and `word_relations` tables are NOT touched.
- Add an `admin_audit_log` table recording who did what to whom and when.
- Build an admin page at `/admin/users` listing users with search + per-row Deactivate / Reactivate / Delete buttons (with a typed-confirmation dialog for delete).
- Enforce the active-account check in the auth/middleware path so deactivated users cannot reach protected routes.
- **BREAKING**: none. New capability; no existing requirements change.

## Capabilities

### New Capabilities
- `admin-user-management`: author-only flows for listing, deactivating, reactivating, and hard-deleting users, plus the audit log that records each action.

### Modified Capabilities
<!-- none -->

## Impact

- **Database**: new migration adding `profiles.is_active` and creating `admin_audit_log`. Verify all per-user tables already use `on delete cascade` to `auth.users(id)`; add cascades where missing.
- **Auth/middleware**: `src/middleware.ts` (or equivalent server-side auth guard) must reject sessions whose profile has `is_active = false`.
- **APIs**: four new routes under `src/app/api/admin/users/`.
- **UI**: new route group `src/app/(dashboard)/admin/users/` (or `src/app/admin/`) gated by an author check.
- **Dependencies**: none. Uses existing Supabase admin client (service role) and Zod.
- **Risk**: hard delete is irreversible. Mitigated by author-only gate, typed confirmation, and audit log.
