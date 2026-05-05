## Context

The repo currently contains only planning documents (`Project-plan/fullPlane.md`, `Project-plan/DB.md`) and an empty `supabase/` directory. The stack is locked by `CLAUDE.md`: Next.js 15 App Router, TypeScript strict, Tailwind + shadcn/ui, Supabase (Postgres + Auth + Storage), hosted on Vercel + Supabase free tiers. This change is the first one: it creates the project, wires Supabase, ships auth, and applies the database schema. Every subsequent phase assumes this foundation works.

The two non-obvious pieces are (1) Supabase auth in Next.js 15 App Router — which uses `@supabase/ssr` and depends on getting middleware and cookie handling right — and (2) Row Level Security policies, which must be enabled on every user-owned table from day one because changing them later under live data is painful.

## Goals / Non-Goals

**Goals:**
- A developer can clone the repo, copy `.env.local.example` to `.env.local`, fill in three env vars, run `npm install && npm run dev`, and reach a working signup / login / logout flow.
- All nine core tables from `Project-plan/DB.md` exist in Supabase with RLS enabled and `auth.uid()`-based policies on every user-owned row.
- A new signup automatically gets a `profiles` row via a database trigger — no client-side coupling.
- Lint, typecheck, and CI run green on a fresh clone.
- A Vercel preview deploy of the `setup/foundation` branch loads the login page successfully.

**Non-Goals:**
- Vocabulary, games, grammar, speaking, AI, spaced repetition (later phases).
- A polished landing page — `/` redirects to `/login` for unauthenticated users and `/dashboard` for authenticated ones.
- Email verification UX polish — Supabase's default verification email is acceptable; custom Resend templates land in Phase 8.
- Account deletion / data export flows — not required for MVP foundation.
- Tests beyond lint + typecheck — explicit per the plan ("if tests exist for this phase").

## Decisions

### Use `@supabase/ssr`, not `@supabase/auth-helpers-nextjs`

`@supabase/auth-helpers-nextjs` is deprecated in favor of `@supabase/ssr`. The new package is the supported path for App Router and handles cookie-based session management correctly across Server Components, Server Actions, Route Handlers, and middleware. **Alternative considered:** rolling our own with `@supabase/supabase-js` directly — rejected because we'd reimplement cookie refresh logic that's notoriously easy to get wrong.

### Three Supabase clients, not one

- `src/lib/supabase/client.ts` — browser client (Client Components only).
- `src/lib/supabase/server.ts` — server client (Server Components, Server Actions, Route Handlers); reads/writes cookies via `next/headers`.
- `src/lib/supabase/middleware.ts` — middleware client; refreshes the session cookie on every request.

This split is required by `@supabase/ssr` because each context has different cookie APIs. Trying to share one client breaks session refresh.

### Route-group based auth boundary

`(auth)` and `(dashboard)` are route groups. The root `middleware.ts` reads the session and redirects:
- unauthenticated request to a `(dashboard)` route → `/login`
- authenticated request to `/login` or `/signup` → `/dashboard`

Middleware is the single enforcement point; pages don't repeat the check. **Alternative considered:** per-page guards in each Server Component. Rejected — easier to forget one page; middleware also handles cookie refresh in the same pass.

### RLS policies: deny-by-default, then allow `auth.uid() = user_id`

Every user-owned table (`profiles`, `user_words`, `game_sessions`, `lesson_progress`, `speaking_recordings`, `ai_conversations`) gets RLS enabled and four policies (SELECT/INSERT/UPDATE/DELETE) gated on `auth.uid() = user_id`. The shared dictionary tables (`words`, `word_relations`, `grammar_lessons`) get RLS enabled with read-only policies for `authenticated`; writes are service-role only (seeded from server code). **Alternative considered:** disabling RLS on shared read-only tables. Rejected — Supabase warns loudly, and consistent "RLS on everywhere" is easier to audit.

### `handle_new_user` trigger creates the profile row

A `SECURITY DEFINER` trigger on `auth.users` inserts a matching `profiles` row on signup with sensible defaults (level `A1`, accent `US`, xp `0`). **Alternative considered:** creating the profile from the OAuth callback handler. Rejected — the trigger guarantees the invariant "every authenticated user has a profile" regardless of how they signed up (email, OAuth, future providers, admin-created).

### Migration discipline

The whole initial schema lives in `supabase/migrations/001_initial_schema.sql`. After this change merges, that file is immutable — every later schema change is a new file (`002_*.sql`, etc.). This is restated from `CLAUDE.md` because it's the single most common mistake in Supabase projects.

### CI: lint + typecheck only, no tests yet

`npm run lint` (next lint) and `npm run typecheck` (`tsc --noEmit`) on every PR. No test runner installed yet — Phase 1 has no testable behavior beyond "auth works," which is verified by the manual smoke test. A test framework will be added in the first phase that ships testable logic (likely Phase 4, spaced repetition).

## Risks / Trade-offs

- **Supabase OAuth redirect URLs require manual configuration in the Supabase dashboard** → Document the exact callback URL (`<site>/api/auth/callback`) in `README.md` and `.env.local.example`. Document both `localhost:3000` for dev and the Vercel preview URL pattern.
- **`@supabase/ssr` cookie handling in Server Actions is easy to get wrong** → Follow the official Next.js App Router quickstart literally; do not invent helpers. The three-client split exists to keep this contained.
- **Migration `001` will end up large (~9 tables, RLS, trigger, indexes)** → Acceptable. It's a one-time bootstrap. Subsequent phases add small focused migrations.
- **Google OAuth requires a Google Cloud project the developer must create** → Document the steps in `README.md`. Email/password works without it, so dev environments can skip Google initially.
- **Vercel preview deploys need the same Supabase env vars** → Document setting them once in Vercel project settings; preview and prod share the same Supabase project for MVP.
- **Putting `.env.local.example` and `README.md` in git, but `.env.local` ignored** → Standard, but call it out so no secrets leak.

## Migration Plan

This is the bootstrap change, so there's nothing to migrate from. Order of operations on a fresh checkout:

1. Developer creates a Supabase project (free tier) and a Google Cloud OAuth client.
2. Developer fills `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Developer runs `supabase db push` (or pastes `001_initial_schema.sql` into the SQL editor) to apply the schema.
4. Developer adds the OAuth callback URL to Supabase Auth settings.
5. `npm install && npm run dev` — signup, login, logout work.
6. Push branch → Vercel preview builds — same flow works on the preview URL.

**Rollback:** since this is the first change, "rollback" means deleting the Supabase project and the Vercel project. No production data is at risk.

## Open Questions

- Do we want to enable Supabase email confirmation now or defer to Phase 8 with Resend? (Default: leave Supabase's built-in confirmation ON; switch to Resend templates in Phase 8.)
- Do we want a basic `/` landing page now or just redirect-to-login? (Default: redirect — Phase 8 adds the marketing page.)
- Should we adopt `supabase` CLI for local dev with Docker, or just point at the hosted free-tier project? (Default: hosted only for MVP — keeps onboarding to one tool.)
