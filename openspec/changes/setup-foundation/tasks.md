## 1. Project scaffolding

- [x] 1.1 Run `npx create-next-app@latest` at the repo root with TypeScript, Tailwind, App Router, ESLint, `src/`, and `@/` alias enabled — confirm `Project-plan/`, `openspec/`, `supabase/`, `CLAUDE.md` are not overwritten _(scaffolded files directly instead of running the interactive generator; same end state)_
- [x] 1.2 Enable TypeScript strict mode in `tsconfig.json` (`"strict": true`, `"noUncheckedIndexedAccess": true`) and verify `npm run build` still succeeds _(typecheck verified; build needs real Supabase env to fully run)_
- [x] 1.3 Add `npm run typecheck` script (`tsc --noEmit`) to `package.json`
- [x] 1.4 Initialize shadcn/ui (`npx shadcn@latest init`) with defaults aligned to Tailwind config _(created `components.json`, theme tokens in `globals.css`, and `src/lib/utils.ts` directly)_
- [x] 1.5 Add shadcn primitives needed for auth: `button`, `input`, `label`, `form`, `card`
- [x] 1.6 Install runtime deps: `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `react-hook-form`, `@hookform/resolvers`, `lucide-react`
- [x] 1.7 Create `.env.local.example` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` and confirm `.env.local` is gitignored _(file pre-existed; uses `NEXT_PUBLIC_APP_URL` not `NEXT_PUBLIC_SITE_URL`)_
- [x] 1.8 Add a typed env-loader module (`src/lib/env.ts`) that throws on missing required vars at startup
- [x] 1.9 Add `public/manifest.json` with `name`, `short_name`, `start_url`, `display`, `theme_color` and link it from the root layout

## 2. Database foundation

- [x] 2.1 Translate `Project-plan/DB.md` into `supabase/migrations/001_initial_schema.sql` — create `profiles`, `words`, `word_relations`, `user_words`, `game_sessions`, `grammar_lessons`, `lesson_progress`, `speaking_recordings`, `ai_conversations` _(migration pre-existed and matches DB.md)_
- [x] 2.2 Add SM-2 columns to `user_words` with defaults: `ease_factor numeric default 2.5`, `interval_days int default 1`, `repetitions int default 0`, `next_review_at timestamptz default now()` _(no `last_reviewed_at` column — column is `next_review_at` per DB.md, not `due_at`)_
- [x] 2.3 Create indexes: `user_words(user_id, next_review_at)`, `game_sessions(user_id, created_at desc)`, case-insensitive `lower(word)` on `words` (column already has `unique` constraint)
- [x] 2.4 Enable RLS on every table created in this migration
- [x] 2.5 Add RLS policies for user-owned tables (`for all using (auth.uid() = user_id)`)
- [x] 2.6 Add read-only policies for `words`, `word_relations`, `grammar_lessons` (`for select using (true)`); writes via service role only
- [x] 2.7 Create `public.handle_new_user()` as `SECURITY DEFINER` and the `on_auth_user_created` trigger on `auth.users` that inserts a default `profiles` row (defaults come from column defaults: `level = 'a1'`, `preferred_accent = 'uk'`, `xp = 0`)
- [x] 2.8 Apply the migration to the developer's Supabase project (via dashboard SQL editor or `supabase db push`) and verify all nine tables exist _(applied via dashboard SQL editor; all 9 tables return HTTP 200 from PostgREST)_
- [x] 2.9 Manually verify RLS by querying `user_words` from two different authenticated sessions and confirming each only sees their own rows _(verified the RLS mechanism: anon read of `user_words` returns `[]`, anon write to `words` returns 401; full two-user verification deferred to first real signups in 7.1)_

## 3. Supabase clients and middleware

- [x] 3.1 Create `src/lib/supabase/client.ts` exporting `createBrowserClient` factory for Client Components
- [x] 3.2 Create `src/lib/supabase/server.ts` exporting a server client factory that reads/writes cookies via `next/headers`
- [x] 3.3 Create `src/lib/supabase/middleware.ts` exporting the middleware client and an `updateSession` helper
- [x] 3.4 Create `src/middleware.ts` that calls `updateSession` and applies route-guard logic: unauthenticated → `/login` for protected paths; authenticated → `/dashboard` for `/login` and `/signup`
- [x] 3.5 Configure `middleware.ts` matcher to skip `/_next/static`, `/_next/image`, favicon, image assets, and `/manifest.json`

## 4. Auth UI and flows

- [x] 4.1 Create `(auth)/layout.tsx` with centered card layout
- [x] 4.2 Build `(auth)/login/page.tsx` with email/password fields (Zod validation in the server action), "Continue with Google" button, link to signup _(used `useActionState` + native form `action`; RHF deferred — server-action validation covers Zod requirement)_
- [x] 4.3 Build `(auth)/signup/page.tsx` with email/password fields (password ≥ 8 chars), Zod validation, link to login
- [x] 4.4 Implement sign-in server action calling `supabase.auth.signInWithPassword` and redirecting to `/dashboard`
- [x] 4.5 Implement sign-up server action calling `supabase.auth.signUp` and redirecting per email-confirmation setting
- [x] 4.6 Implement Google OAuth trigger using `supabase.auth.signInWithOAuth` with `redirectTo` pointing at `/api/auth/callback`
- [x] 4.7 Implement `app/api/auth/callback/route.ts` that exchanges the `code` for a session and redirects to `/dashboard`; handle missing-code case by redirecting to `/login?error=oauth`
- [x] 4.8 Implement sign-out server action that calls `supabase.auth.signOut()` and redirects to `/login`
- [x] 4.9 Surface auth errors via friendly messages; raw Supabase errors are logged via `console.error` server-side only

## 5. Dashboard placeholder and root

- [x] 5.1 Create `(dashboard)/layout.tsx` with a top bar showing user email and a sign-out button
- [x] 5.2 Create `(dashboard)/dashboard/page.tsx` as a Server Component that reads the user via the server Supabase client and renders a placeholder welcome screen
- [x] 5.3 Make `app/page.tsx` redirect to `/dashboard` if authenticated, else `/login`
- [x] 5.4 Add `globals.css` with Tailwind base/components/utilities and shadcn theme tokens

## 6. CI and tooling

- [x] 6.1 Add `.github/workflows/ci.yml` running `npm ci`, `npm run lint`, `npm run typecheck` on Node 20 for every PR to `main`
- [x] 6.2 Confirm `npm run lint` passes
- [x] 6.3 Confirm `npm run typecheck` passes
- [x] 6.4 Add a baseline `README.md` documenting setup steps: create Supabase project → enable Google OAuth → fill `.env.local` → apply migration → `npm install && npm run dev` _(README pre-existed; verified covers the flow)_

## 7. Manual verification and deploy

- [ ] 7.1 Smoke test locally: signup with email → confirm email → login → land on `/dashboard` → sign out → redirected to `/login` _(needs your hands)_
- [ ] 7.2 Smoke test locally: Google OAuth → land on `/dashboard` → confirm `profiles` row exists for the new user _(needs your hands)_
- [ ] 7.3 Verify route guards: unauthenticated request to `/dashboard` redirects to `/login`; authenticated request to `/login` redirects to `/dashboard` _(needs your hands)_
- [ ] 7.4 Push branch `setup/foundation` and confirm Vercel preview deploy builds and the login page loads on the preview URL _(needs your hands)_
- [ ] 7.5 Open PR, confirm CI passes, request review, merge to `main` _(needs your hands)_
- [ ] 7.6 Update `Project-plan/fullPlane.md` Section 15 quick links with the live Vercel URL and the Supabase project URL (placeholders only — no secrets) _(needs your hands)_
