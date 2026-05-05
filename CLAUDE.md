# CLAUDE.md — Claude Code session instructions

This file is loaded automatically into every Claude Code session in this repo. Read it before doing any task.

---

## Project

A free, public English learning web app (A1 → C2). Vocabulary, games, grammar, speaking, AI writing feedback, and a guided roadmap. MVP target: ~6 weeks, $0/month on free tiers.

**The master plan lives in `Project-plan/fullPlane.md`. The database schema lives in `Project-plan/DB.md` and is materialized in `supabase/migrations/001_initial_schema.sql`. Read the plan before starting any non-trivial task.**

---

## Tech stack (LOCKED — do not change without discussion)

- Next.js 15 (App Router) + TypeScript (strict mode)
- Tailwind CSS + shadcn/ui
- Supabase (Postgres + Auth + Storage)
- Google Gemini API (free tier) for AI features
- Free Dictionary API for word lookups
- Browser SpeechSynthesis / Web Speech API for TTS + STT
- Zustand (state), TanStack Query (data), React Hook Form + Zod (forms)
- next-pwa, Web Push API, Resend (email)
- Hosting: Vercel + Supabase

---

## Workflow rules

- Never commit directly to `main`. One feature per branch.
- Branch names follow the roadmap: `setup/foundation`, `feature/vocabulary`, etc.
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- Run `npm run lint && npm run typecheck` before every commit.
- Open a PR when a phase is complete; merge only after review.
- Update the relevant `docs/PHASE_N_*.md` when behavior changes.
- Tag releases: `v0.1.0` after Phase 4, `v1.0.0` after Phase 8.

---

## Code conventions

- TypeScript strict mode ON. No `any` without an explicit `// FIXME`.
- Server Components by default; add `"use client"` only when needed.
- Zod schemas for ALL API input validation.
- Tailwind utilities; no inline `style={{}}` unless dynamic.
- File names: `kebab-case.ts` for files, `PascalCase` for React components.
- Imports: `@/` alias for `src/`.
- Prefer server actions over client-side fetches when possible.
- Throw typed errors; handle them at the API boundary; never leak stack traces to the client.

---

## Pause and ask before

- Adding any npm dependency not listed in the plan
- Changing the database schema (always create a new `supabase/migrations/NNN_*.sql` file; never edit existing migrations)
- Modifying authentication flow
- Adding paid services or third-party APIs
- Refactoring more than one module at a time
- Removing tests
- Force-pushing, rewriting history, or any destructive git operation

---

## Definition of done (per phase)

- All acceptance criteria in the phase's `docs/PHASE_N_*.md` are met
- `npm run lint` passes
- `npm run typecheck` passes
- `npm run test` passes (if tests exist for this phase)
- Manual smoke test: signup → use the new feature → logout works
- Vercel preview deploy works
- PR merged to `main` and docs updated

---

## Free-tier discipline

Cache everything possible. A word looked up once should live in the `words` table forever — never call the Free Dictionary API for a word we already have. Same logic applies to AI calls: dedupe and cache where it makes sense. If a free-tier limit is approached, surface a friendly user-facing error rather than crashing.

---

## Out of scope for v1

Friends/chat, live classes, payments, native mobile apps, multi-language UI, user-created lessons, teacher mode. Park ideas in `Project-plan/fullPlane.md` section 14.
