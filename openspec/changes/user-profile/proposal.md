# Proposal: User Profile

## What
Update signup to collect first name, last name, email, and password. Add a `/dashboard/profile` page where users can view and edit their profile: first name, last name, display name, English level, avatar, and preferred accent. Email is the unique identifier — no separate username field.

## Why
- Signup was too bare; collecting a name makes the app feel personal from day one.
- Users should be able to personalize their experience (avatar, accent preference).
- English level is already stored but has no UI for the user to update it after the placement test.

## Non-goals
- No username / handle system (email is the identifier).
- No public profile pages (v1 scope).
- No social graph, follow system, or friend list.
- No third-party avatar integrations (Gravatar etc.) — only direct upload.

## Success criteria
- Signup form has first name, last name, email, password fields — all values persist on validation error.
- Names are stored in `profiles.first_name` / `profiles.last_name` via the new-user trigger.
- `/dashboard/profile` renders all profile fields with an edit mode.
- Avatar upload stores file in Supabase Storage and saves the public URL.
- Email is always read-only (from Supabase auth, cannot be changed here).
- `npm run lint && npm run typecheck` pass.
