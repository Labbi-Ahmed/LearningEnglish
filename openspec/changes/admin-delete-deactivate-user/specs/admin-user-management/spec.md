## ADDED Requirements

### Requirement: Author-only access
Every admin route and the admin UI SHALL be accessible only to users whose `user_subscriptions.tier = 'author'`. All authorization MUST be enforced server-side; client-side checks are non-binding UI affordances only.

#### Scenario: Non-author hits an admin route
- **WHEN** a signed-in user without `tier='author'` calls any `/api/admin/users/...` endpoint
- **THEN** the server responds with HTTP 403 and writes nothing to the database

#### Scenario: Anonymous user hits an admin route
- **WHEN** an unauthenticated request is made to any `/api/admin/users/...` endpoint
- **THEN** the server responds with HTTP 401

#### Scenario: Non-author visits the admin page
- **WHEN** a signed-in user without `tier='author'` navigates to `/admin/users`
- **THEN** the server-rendered response is an HTTP 404 (the page is hidden, not just blocked) so authors are not enumerable

### Requirement: Admin user list
Authors SHALL be able to view a paginated list of all users with at minimum: email, display name, level, tier, `is_active`, `created_at`. The list MUST support search by email substring (case-insensitive).

#### Scenario: Author opens the admin page
- **WHEN** an author navigates to `/admin/users`
- **THEN** the page renders the first page of users sorted by `created_at desc`

#### Scenario: Author searches by email
- **WHEN** an author types a partial email into the search box and submits
- **THEN** the list re-renders showing only users whose email contains the substring (case-insensitive)

### Requirement: Deactivate user
Authors SHALL be able to deactivate any user. Deactivation sets `profiles.is_active = false`, invalidates the user's existing sessions, and prevents future sign-in until reactivated. All user data is preserved.

#### Scenario: Successful deactivation
- **WHEN** an author POSTs to `/api/admin/users/{id}/deactivate` with a valid target id
- **THEN** `profiles.is_active` for that id is `false`, the user's active sessions are invalidated, and an `admin_audit_log` row is recorded with `action='deactivate'`

#### Scenario: Deactivated user attempts a request
- **WHEN** a user whose `profiles.is_active = false` makes any authenticated request to a protected route
- **THEN** the server responds with HTTP 403 and a generic "account suspended" message

#### Scenario: Deactivated user attempts sign-in
- **WHEN** a user with `is_active = false` completes the sign-in flow and the first authenticated request reaches the app
- **THEN** the middleware/auth guard signs them out and returns "account suspended"

#### Scenario: Author tries to deactivate themselves
- **WHEN** an author POSTs to `/api/admin/users/{their-own-id}/deactivate`
- **THEN** the server responds with HTTP 400 and no changes are made

#### Scenario: Last active author cannot be deactivated
- **WHEN** an author POSTs to deactivate the only remaining active author (target tier='author' and they are the last with `is_active=true`)
- **THEN** the server responds with HTTP 409 and no changes are made

### Requirement: Reactivate user
Authors SHALL be able to reactivate a previously deactivated user, restoring access immediately on the user's next request.

#### Scenario: Successful reactivation
- **WHEN** an author POSTs to `/api/admin/users/{id}/reactivate` for a user whose `is_active = false`
- **THEN** `profiles.is_active` becomes `true` and an `admin_audit_log` row is recorded with `action='reactivate'`

#### Scenario: Reactivating an already-active user
- **WHEN** an author POSTs to `/api/admin/users/{id}/reactivate` for a user whose `is_active = true`
- **THEN** the server responds with HTTP 200, no audit row is written, and the field stays `true` (idempotent)

### Requirement: Hard delete user
Authors SHALL be able to hard-delete any user. The deletion MUST remove the row from `auth.users` and all per-user rows in every dependent table via cascade, MUST delete the user's storage objects in the `speaking` and `avatars` buckets, and MUST NOT delete any rows from the global `words` or `word_relations` tables.

#### Scenario: Successful hard delete
- **WHEN** an author DELETEs `/api/admin/users/{id}` with a non-empty `reason` body field
- **THEN** the user is removed from `auth.users`, all per-user rows in dependent tables are gone via cascade, the user's `speaking/<id>/` and `avatars/<id>/` storage prefixes are emptied, an `admin_audit_log` row is written with `action='delete'` and the supplied reason, and the response is HTTP 200

#### Scenario: Words cache is preserved on delete
- **WHEN** a user is hard-deleted who had previously contributed entries to the `words` cache via lookups
- **THEN** rows in `words` and `word_relations` are NOT deleted

#### Scenario: Delete without reason
- **WHEN** an author DELETEs `/api/admin/users/{id}` without a `reason` field or with an empty string
- **THEN** the server responds with HTTP 400 and no changes are made

#### Scenario: Audit log written before destructive action
- **WHEN** the audit-log INSERT fails for any reason during a delete request
- **THEN** the server aborts with HTTP 500 and does not call `auth.admin.deleteUser` or touch storage

#### Scenario: Storage delete fails
- **WHEN** deleting the user's storage objects fails partway through
- **THEN** the server aborts with HTTP 500 before the auth row is deleted; the operator may retry the request safely

#### Scenario: Author tries to delete themselves
- **WHEN** an author DELETEs `/api/admin/users/{their-own-id}`
- **THEN** the server responds with HTTP 400 and no changes are made

#### Scenario: Last active author cannot be deleted
- **WHEN** an author DELETEs the only remaining active author
- **THEN** the server responds with HTTP 409 and no changes are made

### Requirement: Audit log
Every successful deactivate, reactivate, and delete action SHALL produce one row in `admin_audit_log` capturing actor id, target id (as plain uuid, no foreign key), action, optional reason, optional metadata jsonb, and `created_at`. The table SHALL be append-only: only the service role may INSERT, no client may UPDATE or DELETE, and authors may SELECT.

#### Scenario: Author views audit log
- **WHEN** an author selects from `admin_audit_log` (via a future UI or direct query under their session)
- **THEN** RLS permits the read

#### Scenario: Non-author tries to read audit log
- **WHEN** a non-author user queries `admin_audit_log`
- **THEN** RLS returns zero rows

#### Scenario: Anyone tries to UPDATE or DELETE an audit row
- **WHEN** any client (author included) issues UPDATE or DELETE on `admin_audit_log`
- **THEN** the operation is rejected by RLS

### Requirement: Confirmation UI for delete
The admin UI SHALL require the operator to type the target user's email exactly before the delete button becomes active. Deactivate and reactivate require a single-click confirm.

#### Scenario: Operator types non-matching text
- **WHEN** the operator opens the delete dialog and types text that does not match the target's email
- **THEN** the destructive button remains disabled

#### Scenario: Operator types matching text
- **WHEN** the operator types the target's email exactly
- **THEN** the destructive button enables and clicking it triggers the DELETE request
