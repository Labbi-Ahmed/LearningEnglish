## 1. Project scaffolding

- [ ] 1.1 Run `npx create-next-app@latest` at the repo root with TypeScript, Tailwind, App Router, ESLint, `src/`, and `@/` alias enabled — confirm `Project-plan/`, `openspec/`, `supabase/`, `CLAUDE.md` are not overwritten
- [ ] 1.2 Enable TypeScript strict mode in `tsconfig.json` (`"strict": true`, `"noUncheckedIndexedAccess": true`) and verify `npm run build` still succeeds
- [ ] 1.3 Add `npm run typecheck` script (`tsc --noEmit`) to `package.json`
- [ ] 1.4 Initialize shadcn/ui (`npx shadcn@latest init`) with defaults aligned to Tailwind config
- [ ] 1.5 Add shadcn primitives needed for auth: `button`, `input`, `label`, `form`, `card`
- [ ] 1.6 Install runtime deps: `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `react-hook-form`, `@hookform/resolvers`, `lucide-react`
- [ ] 1.7 Create `.env.local.example` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` and confirm `.env.local` is gitignored
- [ ] 1.8 Add a typed env-loader module (`src/lib/env.ts`) that throws on missing required vars at startup
- [ ] 1.9 Add `public/manifest.json` with `name`, `short_name`, `start_url`, `display`, `theme_color` and link it from the root layout

## 2. Database foundation

- [ ] 2.1 Translate `Project-plan/DB.md` into `supabase/migrations/001_initial_schema.sql` — create `profiles`, `words`, `word_relations`, `user_words`, `game_sessions`, `grammar_lessons`, `lesson_progress`, `speaking_recordings`, `ai_conversations`
- [ ] 2.2 Add SM-2 columns to `user_words` with defaults: `ease_factor float8 default 2.5`, `interval_days int default 0`, `repetitions int default 0`, `due_at timestamptz default now()`, `last_reviewed_at timestamptz`
- [ ] 2.3 Create indexes: `user_words(user_id, due_at)`, `game_sessions(user_id, created_at desc)`, unique index on `words(text)`
- [ ] 2.4 Enable RLS on every table created in this migration
- [ ] 2.5 Add RLS policies for user-owned tables (SELECT/INSERT/UPDATE/DELETE gated on `auth.uid() = user_id`)
- [ ] 2.6 Add read-only RLS policies for `authenticated` on `words`, `word_relations`, `grammar_lessons`; no insert/update/delete grants for `authenticated` on those tables (writes via service role only)
- [ ] 2.7 Create `public.handle_new_user()` as `SECURITY DEFINER` and the `on_auth_user_created` trigger on `auth.users` that inserts a default `profiles` row (`level = 'A1'`, `preferred_accent = 'US'`, `xp = 0`)
- [ ] 2.8 Apply the migration to the developer's Supabase project (via dashboard SQL editor or `supabase db push`) and verify all nine tables exist
- [ ] 2.9 Manually verify RLS by querying `user_words` from two different authenticated sessions and confirming each only sees their own rows

## 3. Supabase clients and middleware

- [ ] 3.1 Create `src/lib/supabase/client.ts` exporting `createBrowserClient` factory for Client Components
- [ ] 3.2 Create `src/lib/supabase/server.ts` exporting a server client factory that reads/writes cookies via `next/headers`
- [ ] 3.3 Create `src/lib/supabase/middleware.ts` exporting the middleware client and an `updateSession` helper
- [ ] 3.4 Create `src/middleware.ts` that calls `updateSession` and applies route-guard logic: unauthenticated → `/login` for `(dashboard)` paths; authenticated → `/dashboard` for `/login` and `/signup`
- [ ] 3.5 Configure `middleware.ts` matcher to skip `/_next`, static files, favicon, and `/manifest.json`

## 4. Auth UI and flows

- [ ] 4.1 Create `(auth)/layout.tsx` with centered card layout
- [ ] 4.2 Build `(auth)/login/page.tsx` with React Hook Form + Zod validation, email/password fields, "Continue with Google" button, and link to signup
- [ ] 4.3 Build `(auth)/signup/page.tsx` with email/password fields (password ≥ 8 chars), Zod validation, link to login
- [ ] 4.4 Implement sign-in server action calling `supabase.auth.signInWithPassword` and redirecting to `/dashboard`
- [ ] 4.5 Implement sign-up server action calling `supabase.auth.signUp` and redirecting per email-confirmation setting
- [ ] 4.6 Implement Google OAuth trigger using `supabase.auth.signInWithOAuth` with `redirectTo` pointing at `/api/auth/callback`
- [ ] 4.7 Implement `app/api/auth/callback/route.ts` that exchanges the `code` for a session and redirects to `/dashboard`; handle missing-code case by redirecting to `/login?error=...`
- [ ] 4.8 Implement sign-out server action that calls `supabase.auth.signOut()` and redirects to `/login`
- [ ] 4.9 Surface auth errors via friendly messages; ensure no Supabase error stack reaches the client (log raw errors server-side only)

## 5. Dashboard placeholder and root

- [ ] 5.1 Create `(dashboard)/layout.tsx` with a top bar showing user email and a sign-out button
- [ ] 5.2 Create `(dashboard)/dashboard/page.tsx` as a Server Component that reads the user via the server Supabase client and renders a placeholder welcome screen
- [ ] 5.3 Make `app/page.tsx` redirect to `/dashboard` if authenticated, else `/login`
- [ ] 5.4 Add `globals.css` with Tailwind base/components/utilities and any shadcn theme tokens

## 6. CI and tooling

- [ ] 6.1 Add `.github/workflows/ci.yml` running `npm ci`, `npm run lint`, `npm run typecheck` on Node 20 for every PR to `main`
- [ ] 6.2 Confirm `npm run lint` passes on a fresh checkout
- [ ] 6.3 Confirm `npm run typecheck` passes on a fresh checkout
- [ ] 6.4 Add a baseline `README.md` documenting setup steps: create Supabase project → enable Google OAuth → fill `.env.local` → apply migration → `npm install && npm run dev`

## 7. Manual verification and deploy

- [ ] 7.1 Smoke test locally: signup with email → confirm email → login → land on `/dashboard` → sign out → redirected to `/login`
- [ ] 7.2 Smoke test locally: Google OAuth → land on `/dashboard` → confirm `profiles` row exists for the new user
- [ ] 7.3 Verify route guards: unauthenticated request to `/dashboard` redirects to `/login`; authenticated request to `/login` redirects to `/dashboard`
- [ ] 7.4 Push branch `setup/foundation` and confirm Vercel preview deploy builds and the login page loads on the preview URL
- [ ] 7.5 Open PR, confirm CI passes, request review, merge to `main`
- [ ] 7.6 Update `Project-plan/fullPlane.md` Section 15 quick links with the live Vercel URL and the Supabase project URL (placeholders only — no secrets)
