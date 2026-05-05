# Phase 1 — Foundation setup

> Branch: `setup/foundation`
> Estimate: 2–3 days
> Goal: a fresh Next.js 15 app deployed to Vercel, connected to Supabase, with email + Google auth working end-to-end.

---

## 1. Acceptance criteria

A reviewer should be able to:

1. Clone the repo, run `npm install`, copy `.env.local.example` → `.env.local`, fill in keys, and run `npm run dev` successfully.
2. Visit `/` and see the landing page.
3. Visit `/signup`, create an account with email/password, and receive a verification email.
4. Visit `/login`, sign in with that account, and land on `/dashboard`.
5. Sign in with Google OAuth from `/login`.
6. See their row in the `profiles` table, auto-created on first login, with `level='a1'` and `preferred_accent='uk'`.
7. Click "Log out" and be redirected to `/`.
8. Be unable to visit `/dashboard` while logged out (middleware redirect to `/login`).
9. See the deployed Vercel preview at the PR URL, also working end-to-end.
10. `npm run lint`, `npm run typecheck`, and `npm run build` all pass.

---

## 2. Tasks (in order)

### 2.1 Bootstrap the Next.js project

- `npx create-next-app@latest .` with: TypeScript ✅, ESLint ✅, Tailwind ✅, App Router ✅, `src/` directory ✅, import alias `@/*` ✅.
- Verify `tsconfig.json` has `"strict": true`.
- Add `npm scripts`: `lint`, `typecheck` (`tsc --noEmit`), `format` (prettier optional).

### 2.2 Install core dependencies

```
npm i @supabase/supabase-js @supabase/ssr
npm i zustand @tanstack/react-query
npm i react-hook-form zod @hookform/resolvers
npm i lucide-react
```

shadcn/ui:

```
npx shadcn@latest init
npx shadcn@latest add button input label card form toast
```

**No other dependencies** without updating `Project-plan/fullPlane.md` first.

### 2.3 Folder scaffolding

Create the empty folders described in `Project-plan/fullPlane.md` §4. Add a `.gitkeep` in any folder you want to commit empty.

### 2.4 Supabase project

- Create a free Supabase project. Region: closest to expected users.
- Copy the URL + anon key + service role key into `.env.local`.
- Run `supabase/migrations/001_initial_schema.sql` in the SQL editor.
- Verify all tables exist and RLS is enabled on user-scoped tables.

### 2.5 Supabase clients

Create:

- `src/lib/supabase/client.ts` — browser client (`createBrowserClient`)
- `src/lib/supabase/server.ts` — server client (`createServerClient`, reads cookies)
- `src/lib/supabase/middleware.ts` — refreshes session in middleware

### 2.6 Auth pages

- `src/app/(auth)/login/page.tsx` — email/password + "Sign in with Google" button
- `src/app/(auth)/signup/page.tsx` — email/password + Google
- `src/app/api/auth/callback/route.ts` — exchanges OAuth code for a session
- All forms use React Hook Form + Zod.

### 2.7 Profile auto-create trigger

Add a Postgres trigger so `auth.users` insert → `profiles` insert. Put it in a new migration `002_profile_trigger.sql` (do not edit `001_initial_schema.sql`).

```sql
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### 2.8 Route guard middleware

`src/middleware.ts` — for any route under `(dashboard)`, redirect unauthenticated users to `/login`.

### 2.9 Dashboard shell

- `src/app/(dashboard)/layout.tsx` — sidebar + topbar + log-out button
- `src/app/(dashboard)/page.tsx` — placeholder "Welcome, {name}"

### 2.10 Landing page

`src/app/page.tsx` — hero, one-line pitch, "Start learning" CTA → `/signup`. Keep it minimal; polish in Phase 8.

### 2.11 Deploy

- Push branch, open PR.
- Connect repo to Vercel. Add the same env vars to Vercel project settings.
- Confirm preview deploy works for the PR.

### 2.12 CI

`.github/workflows/ci.yml` — on PR: `npm ci && npm run lint && npm run typecheck && npm run build`.

---

## 3. Out of scope for Phase 1

- Word lookup, vocabulary UI → Phase 2
- Any game logic → Phase 3
- Spaced repetition → Phase 4
- Forgot-password flow → can ship in Phase 8 polish
- Profile editing UI → Phase 7

---

## 4. Smoke test script

```
1. Open incognito window
2. Visit preview URL → see landing page
3. Click "Start learning" → /signup
4. Sign up with a fresh email → check inbox → click verify link
5. Land on /dashboard → see name displayed
6. Open /dashboard in a second tab → still logged in
7. Click log out → redirected to /
8. Try /dashboard directly → redirected to /login
9. Click "Sign in with Google" → consent → /dashboard
10. Check Supabase → profiles row exists with this user_id
```

All ten steps must pass before merging.
