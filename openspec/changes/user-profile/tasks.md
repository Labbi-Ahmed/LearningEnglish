# Tasks: User Profile

## T1 — Migration: add first_name, last_name, avatar_url columns ✓
- Created `supabase/migrations/0017_profiles_username_avatar.sql`
- Adds `first_name`, `last_name`, `avatar_url` columns
- Updates `handle_new_user` trigger to populate names from auth metadata on signup

## T2 — Create Supabase Storage bucket for avatars (manual)
- In Supabase dashboard: create bucket `avatars`, public read
- Add Storage RLS policy: authenticated users can insert/update only `avatars/<uid>.*`
- Note the public URL pattern: `<SUPABASE_URL>/storage/v1/object/public/avatars/<uid>.<ext>`

## T3 — Zod schema for profile update ✓
- Created `src/lib/schemas/profile.ts`
- `updateProfileSchema`: `{ first_name, last_name, display_name, level, preferred_accent }` all optional

## T4 — API route: `PUT /api/profile` ✓
- Created `src/app/api/profile/route.ts`
- Auth check → Zod parse → `supabase.from('profiles').update()`

## T5 — API route: `POST /api/profile/avatar` ✓
- Created `src/app/api/profile/avatar/route.ts`
- Auth check → MIME + size validation → Supabase Storage upload → update `profiles.avatar_url`

## T6 — Username prompt ~~(skipped — no username system)~~
## T7 — Username prompt in layout ~~(skipped — no username system)~~

## T8 — Profile form component ✓
- Created `src/components/profile/profile-form.tsx`
- View/edit mode toggle, avatar upload, all profile fields, inline feedback

## T9 — Profile page ✓
- Created `src/app/(dashboard)/profile/page.tsx`
- Server Component, fetches profile + auth email, renders `<ProfileForm />`

## T10 — Add Profile nav link ✓
- Added `{ href: "/profile", label: "Profile", icon: "👤" }` to dashboard layout

## T11 — Lint + typecheck ✓
- Installed missing shadcn components: avatar, select, badge
- `npm run lint && npm run typecheck` both pass

## T12 — Smoke test (manual)
- Sign up → names saved in profile automatically
- Go to `/dashboard/profile` → all fields visible
- Edit mode → change any field → Save → changes persist on refresh
- Upload avatar → appears immediately after save
- Apply migration `0017` in Supabase + create `avatars` storage bucket before testing avatar
