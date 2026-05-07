## Context

The product is a free public English-learning app. There is currently no admin tooling: account-level intervention (spam, abuse, GDPR-style erasure requests) requires running SQL with the Supabase service role by hand. Authoring/admin privileges already exist conceptually as `user_subscriptions.tier = 'author'`, which today only bypasses quotas.

Per-user data is spread across many tables (`profiles`, `user_words`, `game_sessions`, `lesson_progress`, `speaking_recordings`, `ai_conversations`, `user_xp_events`, `user_badges`, `push_subscriptions`, `user_subscriptions`, `daily_usage`, `plan_events`). All of these already declare `on delete cascade` against either `auth.users(id)` or `profiles(id)`. The shared knowledge tables `words` and `word_relations` are global (not user-keyed) and must survive deletion to honor the free-tier discipline ("a word looked up once should live in the words table forever").

There are also storage objects: `speaking` bucket holds `<user_id>/<uuid>.<ext>` audio files; `avatars` bucket holds avatar uploads. These are NOT cascaded by the database and must be cleaned up explicitly.

## Goals / Non-Goals

**Goals:**
- Allow `tier='author'` users to deactivate / reactivate / hard-delete any user from a UI.
- Make hard delete a single transactional action that removes the auth user and lets DB cascades wipe per-user rows; explicitly delete the user's storage objects too.
- Keep `words` and `word_relations` rows untouched on delete (free-tier cache discipline).
- Block deactivated users from signing in or accessing protected routes immediately.
- Record every admin action (actor, target, action, reason, timestamp) in an append-only audit log.
- Author-only authorization enforced server-side; never trust the client.

**Non-Goals:**
- Self-service "delete my account" for end users (separate change).
- Soft-delete with restore (deactivate already covers reversible suspension).
- Bulk delete / bulk deactivate (single-user actions only for v1).
- Role hierarchy (no super-admin / co-admin distinction; one author tier).
- Email notification to the deleted/deactivated user (could be added later).

## Decisions

### 1. Identify admin via `user_subscriptions.tier = 'author'`
Reuse the existing tier rather than introducing `profiles.is_admin` or a `role` enum.
- **Why**: Zero schema churn, matches the existing "Author bypasses quotas" pattern in `0020_subscriptions_and_usage.sql`. Promoting an admin is the same SQL we already document.
- **Alternatives considered**: `profiles.is_admin boolean` (cleaner separation of billing vs. auth, but duplicates the existing tier concept); `profiles.role` enum (over-engineered for one role).
- **Implication**: The author check is `select tier from user_subscriptions where user_id = auth.uid()`. Wrapped in a server helper `requireAuthor()` used by every admin route.

### 2. Hard delete via `auth.admin.deleteUser()` + cascades
The admin DELETE endpoint calls `supabaseAdmin.auth.admin.deleteUser(targetId)` (service-role client). Cascades remove all per-user rows automatically.
- **Why**: One source of truth (auth.users is the root). Avoids a hand-maintained list of tables that drifts as we add features.
- **Alternatives considered**: A SQL function `delete_user_cascade(uuid)` that explicitly truncates each table — more code to maintain, easy to miss a new table.
- **Pre-flight check** in this change: every per-user table currently has `on delete cascade`. The migration in this change adds an assertion comment listing them; if a future migration adds a per-user table, the author must add the cascade (added to the migration template guidance in `supabase/migrations/README.md`).

### 3. Storage cleanup is explicit
Before calling `auth.admin.deleteUser`, the route lists and deletes:
- everything under `speaking/<user_id>/`
- everything under `avatars/<user_id>/` (if any)
- **Why**: Supabase storage objects do not cascade with auth row deletion. Leaving orphaned audio files leaks disk and PII.
- **Trade-off**: If storage delete fails partway, we abort before deleting the auth row so the operator can retry. Idempotent — listing returns nothing on a second run.

### 4. Deactivation = `profiles.is_active = false` + sign-out
Add `is_active boolean not null default true` to `profiles`. Server-side guard rejects any request whose profile has `is_active = false`. After flipping the flag, the API also calls `auth.admin.signOut(userId)` to invalidate active sessions.
- **Why**: App-level flag is easy to read in middleware and existing API guards; sign-out via admin API ensures already-issued JWTs cannot continue using the app until they expire.
- **Alternative**: Supabase `banned_until` only — works but is opaque to app code and harder to surface in the UI ("this user is suspended").
- **Sign-in block**: deactivated users who try to sign in get a generic "this account is suspended" error from the middleware on first request after sign-in.

### 5. Words and word_relations are NEVER deleted
Confirmed by inspection: `words` has no `user_id`; `word_relations` references `words` only. Hard-delete touches neither. The migration in this change adds a comment in the new migration noting this contract so future schema work doesn't accidentally add a user_id to `words` without a discussion.

### 6. Audit log is append-only
New table `admin_audit_log (id, actor_id, target_id, action, reason, metadata jsonb, created_at)`. RLS: only `tier='author'` can SELECT; only the service role can INSERT. The DELETE/deactivate routes write the audit row in the same request before performing the destructive action; if the audit insert fails, the action is aborted.
- **Why "before"**: better to fail loudly with no action taken than to delete and lose the record.
- **target_id is plain uuid (no FK)**: a deleted user's audit rows must survive, so we deliberately do NOT make this a foreign key.

### 7. UI: typed-confirmation for delete
Delete dialog requires the operator to type the target's email (or username) to enable the destructive button. Reactivate/Deactivate use a single-click confirm. Pattern matches GitHub's repo-delete flow.

### 8. Author cannot delete themselves
Server-side guard: `if (targetId === authorId) return 400`. Prevents a foot-gun.

### 9. At-least-one-author invariant
On delete or deactivate, if the target is an author and they are the only remaining active author, refuse with 409. Counted via `select count(*) from user_subscriptions s join profiles p on p.id=s.user_id where s.tier='author' and p.is_active`.

## Risks / Trade-offs

- **[Risk] Cascading delete is irreversible** → Mitigations: typed-confirmation in UI, author-only gate, audit log written before action, no bulk endpoint.
- **[Risk] Storage delete partial failure leaves orphans** → Abort before auth deletion; operator retries the request. Idempotent listing means re-running is safe.
- **[Risk] Future per-user table forgotten without cascade** → New `supabase/migrations/README.md` line item plus comment in this change's migration; a periodic audit query is included as a verify line.
- **[Risk] Author accidentally deactivates themselves and locks out admin UI** → Self-action guard rejects deactivate-self; combined with at-least-one-author invariant.
- **[Risk] Race: audit row written, action then crashes mid-flight** → Acceptable. Audit log is the source of truth for "what was attempted"; a follow-up reconciliation can detect orphaned profiles vs. missing auth users if it ever occurs in practice.
- **[Trade-off] No soft delete with restore** → Keeps the model simple. Deactivate is the reversible option; delete is final by design.

## Migration Plan

1. Ship migration `0022_admin_audit_and_active.sql`:
   - `alter table profiles add column is_active boolean not null default true;`
   - `create table admin_audit_log (...)` with RLS.
   - Backfill: existing users get `is_active = true` (default handles this).
2. Deploy server changes (middleware guard, admin routes, UI page) behind no flag — the route group is gated by author check, so non-authors see nothing.
3. Manually promote the first author via service-role SQL: `update user_subscriptions set tier='author' where user_id = '<uuid>';`
4. Smoke test in preview env: deactivate a throwaway test user, then reactivate, then hard-delete. Verify cascades + storage cleanup with a `select` query and a storage list.
5. Rollback: revert the deploy. The migration is additive; the new column and table can stay without affecting older code paths.

## Open Questions

- Do we want a "reason" required field on deactivate/delete (free text in audit log), or optional? **Default: required for delete, optional for deactivate.**
- Should the deactivated user's email be released for re-signup, or held? **Default: held (auth row still exists with the same email until hard-delete).**
