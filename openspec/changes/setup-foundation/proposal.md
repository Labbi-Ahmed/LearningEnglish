## Why

Nothing is built yet. The project plan (`Project-plan/fullPlane.md`) locks the stack but the repo has no `src/`, no `package.json`, no migrations applied, and no auth. Every subsequent phase (vocabulary, games, grammar, speaking, AI) depends on a working Next.js + Supabase + auth shell. This change delivers Phase 1 of the roadmap so that Phase 2 work can start against a real, deployed foundation.

## What Changes

- Initialize a Next.js 15 (App Router) + TypeScript (strict) project at the repo root.
- Add Tailwind CSS + shadcn/ui with a base theme and the handful of primitives needed for auth screens (button, input, label, form, card).
- Wire up Supabase: browser client, server client, and middleware-based session refresh.
- Implement email + Google OAuth sign-up / sign-in / sign-out flows on `(auth)/login` and `(auth)/signup`, plus `/api/auth/callback`.
- Add a `(dashboard)` route group with a placeholder authenticated landing page and route-guard middleware that redirects unauthenticated users to `/login`.
- Apply the initial database migration (`supabase/migrations/001_initial_schema.sql`) creating all core tables from the plan's schema, with Row Level Security enabled and policies on every user-owned table.
- Add `npm run lint`, `npm run typecheck`, and a GitHub Actions CI workflow that runs both on PRs.
- Add `.env.local.example`, baseline `README.md`, PWA manifest stub, and confirm a Vercel preview deploy succeeds.

Out of scope for this change (deferred to later phases): vocabulary lookup, games, grammar lessons, speaking, AI features, spaced repetition, push notifications, the placement test, and the marketing landing page beyond a minimal placeholder.

## Capabilities

### New Capabilities

- `app-shell`: Next.js App Router project, TypeScript strict config, Tailwind + shadcn/ui design system, route group layout for `(auth)` and `(dashboard)`, env loading, lint/typecheck scripts, and CI.
- `user-auth`: Supabase Auth with email/password and Google OAuth, session middleware that refreshes cookies on every request, route guards that protect `(dashboard)`, sign-up / sign-in / sign-out flows, and the OAuth callback handler.
- `database-foundation`: Applied initial Postgres schema covering `profiles`, `words`, `word_relations`, `user_words`, `game_sessions`, `grammar_lessons`, `lesson_progress`, `speaking_recordings`, `ai_conversations`; Row Level Security enabled on every user-owned table with deny-by-default policies and explicit `auth.uid()` checks; a `handle_new_user` trigger that creates a `profiles` row on signup.

### Modified Capabilities

None — this is the first change.

## Impact

- **Code**: Creates `src/` (app router, components, lib/supabase, middleware), `supabase/migrations/001_initial_schema.sql`, `.github/workflows/ci.yml`, `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.js`, `postcss.config.js`, `components.json`, `public/manifest.json`, `.env.local.example`, `README.md`.
- **Dependencies (all listed in the locked stack)**: `next`, `react`, `react-dom`, `typescript`, `@supabase/supabase-js`, `@supabase/ssr`, `tailwindcss`, `postcss`, `autoprefixer`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `zod`, `react-hook-form`, `@hookform/resolvers`. Dev: `eslint`, `eslint-config-next`, `@types/*`, `prettier`.
- **External services**: Requires a Supabase project (free tier) with Google OAuth provider configured, and a Vercel project linked to the repo. Both are user-provisioned; this change documents the required env vars but does not create the cloud resources.
- **Free-tier risk**: None — Supabase free DB + Vercel free hosting easily cover a foundation with zero traffic.
- **Downstream**: Unblocks Phases 2–8. The migration applied here is the contract subsequent phases extend via new `NNN_*.sql` files (never edited in place).
