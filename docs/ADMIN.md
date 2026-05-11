# Admin user management

Authors (users with `user_subscriptions.tier = 'author'`) can manage accounts at
`/admin/users`. Non-authors do not see the link in the nav and the route returns
404 to keep the surface non-enumerable.

## What it does

- **Search and list** all users by email substring.
- **Deactivate** — sets `profiles.is_active = false`, ends every active session,
  and blocks future sign-ins until reactivated. All data is preserved.
- **Reactivate** — flips `is_active` back to `true`. Idempotent.
- **Hard delete** — removes the `auth.users` row. All per-user tables cascade
  (`profiles`, `user_words`, `game_sessions`, `lesson_progress`,
  `speaking_recordings`, `ai_conversations`, `user_xp_events`, `user_badges`,
  `push_subscriptions`, `user_subscriptions`, `daily_usage`,
  `subscription_events`). Storage objects under `speaking/<id>/` and
  `avatars/<id>/` are deleted explicitly. The shared `words` and
  `word_relations` cache is **never** touched.

## Guards

- Author cannot delete or deactivate themselves (400).
- The last remaining active author cannot be deactivated or deleted (409).
- Hard delete requires a non-empty `reason` and a typed-email confirmation.
- Every successful action writes one row to `admin_audit_log` (append-only,
  `tier='author'` SELECT-only via RLS).

## Promoting an author

There is no in-app way to grant `tier='author'`. Run service-role SQL:

```sql
update user_subscriptions
   set tier = 'author', updated_at = now()
 where user_id = (select id from auth.users where email = 'YOU@example.com');
```

## Cache controls

Authors also get a `/admin/cache` sub-page (sibling tab next to "Users") for
manually triggering the Redis warming jobs and viewing each job's last run.
See `docs/CACHING.md` → "Admin controls" for details.

## Adding new per-user tables

Any new per-user table MUST declare `references auth.users(id) on delete cascade`
or `references profiles(id) on delete cascade` so admin hard-delete keeps
working. See `supabase/migrations/README.md`.
