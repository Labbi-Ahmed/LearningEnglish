# Design: User Profile

## Database

### New migration: `0017_profiles_username_avatar.sql`
Add two missing columns to `profiles`:

```sql
alter table profiles add column if not exists username text unique;
alter table profiles add column if not exists avatar_url text;
create unique index if not exists profiles_username_idx on profiles (lower(username));
```

- `username`: unique, case-insensitive (index on `lower(username)`), nullable until user sets it.
- `avatar_url`: public URL from Supabase Storage, nullable.

### Supabase Storage bucket
Create bucket `avatars` (public read, authenticated write, 2 MB file size limit, image types only).

---

## API Routes

### `GET /api/profile` (already exists pattern — use server action instead)
All profile reads happen via a Server Component using the Supabase server client — no API route needed.

### `PUT /api/profile` — update profile fields
- Auth: requires session (middleware already enforces this).
- Input (Zod): `{ username?, display_name?, level?, preferred_accent? }`
- Validates username uniqueness: `select id from profiles where lower(username) = lower($1) and id != $userId`.
- Returns `{ ok: true }` or `{ error: string }`.

### `POST /api/profile/avatar` — upload avatar
- Accepts `multipart/form-data` with a single `file` field.
- Validates: image/jpeg | image/png | image/webp, max 2 MB.
- Uploads to `avatars/<userId>.<ext>` in Supabase Storage (upsert).
- Updates `profiles.avatar_url` with the public URL.
- Returns `{ url: string }` or `{ error: string }`.

---

## Components & Pages

### Username prompt — `src/components/profile/username-prompt.tsx`
- Client component rendered inside the dashboard layout.
- Shown when `profile.username` is `null`.
- Modal/card overlay asking user to pick a username.
- Calls `PUT /api/profile` on submit.
- Disappears once username is saved (optimistic update + revalidate).

### Dashboard layout change — `src/app/(dashboard)/layout.tsx`
- Fetch profile in the layout Server Component.
- If `profile.username === null`, render `<UsernamePrompt />` above the page content.

### Profile page — `src/app/(dashboard)/profile/page.tsx`
- Server Component that fetches profile data.
- Renders `<ProfileForm />` client component with initial values.

### Profile form — `src/components/profile/profile-form.tsx`
- Client component with edit mode toggle (View → Edit → Save/Cancel).
- Fields:
  - **Email** — `<Input disabled />` always, read from Supabase auth session.
  - **Username** — editable text, `@` prefix hint, lowercase only.
  - **Display name** — editable text, optional.
  - **English level** — `<Select>` with A1–C2 options.
  - **Preferred accent** — `<Select>` with UK/US options.
  - **Avatar** — `<Avatar>` showing current image + file input button.
- On Save: calls `PUT /api/profile` (and `POST /api/profile/avatar` if file selected).
- Inline error/success feedback.

### Avatar component — use shadcn/ui `Avatar` already in project.

---

## Navigation

Add **Profile** link to the dashboard sidebar nav, pointing to `/dashboard/profile`.

---

## Data flow

```
Server Component (page.tsx)
  └─ createClient() → select profile by auth.uid()
       └─ passes initialData to <ProfileForm />
            ├─ edit mode → PUT /api/profile (fetch)
            └─ avatar change → POST /api/profile/avatar (FormData fetch)
                  └─ router.refresh() to re-render Server Component
```

---

## Security

- All API routes check `supabase.auth.getUser()` and return 401 if not authenticated.
- Avatar upload enforces MIME type and size server-side (never trust client).
- Username uniqueness check uses parameterized query via Supabase client (no SQL injection risk).
- RLS: existing `"users see own profile"` policy already covers `update` for own row.
- Storage RLS: `avatars` bucket policy — authenticated users can only write to `avatars/<their-uid>.*`.
