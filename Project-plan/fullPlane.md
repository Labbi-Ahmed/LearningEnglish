# English Learning App — Project Plan

> Master plan document. Read this before starting any task.
> Tech stack and architecture are locked. Do not change without discussion.

---

## 1. Vision

A free, public English learning web app for all levels (A1 → C2) that combines:
- A smart vocabulary notebook (manual + auto-lookup with meanings, synonyms, antonyms)
- Game-based learning (spell, sentence, synonym, quiz)
- Grammar & tense lab
- Speaking & pronunciation practice (UK + US accents)
- AI-powered writing feedback and conversation partner
- A guided learning roadmap with progress tracking, streaks, and notifications

Goal: ship a working public MVP in ~6 weeks, hosted entirely on free tiers.

---

## 2. Target users

- Public learners worldwide
- All levels: A1, A2, B1, B2, C1, C2
- Auto-leveling via placement test
- Both UK and US English accents supported

---

## 3. Tech stack (LOCKED)

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript | Free hosting on Vercel, no cold starts |
| Styling | Tailwind CSS + shadcn/ui | Fast, accessible, no design overhead |
| Backend | Next.js API routes (serverless) | Same project, same deploy |
| Database | Supabase (PostgreSQL) | Free 500MB, real-time, 50k MAU |
| Auth | Supabase Auth (email + Google OAuth) | Built-in, JWT, secure |
| File storage | Supabase Storage | Voice recordings, free 1GB |
| AI | Google Gemini API (free tier) | Generous free quota; can swap to Claude later |
| Dictionary | Free Dictionary API | No key, unlimited |
| Audio (TTS) | Browser SpeechSynthesis API | Free, has UK + US voices built-in |
| Speech-to-text | Web Speech API | Free, browser-native |
| State | Zustand | Tiny, simple |
| Data fetching | TanStack Query | Caching, retries, optimistic updates |
| Forms | React Hook Form + Zod | Type-safe validation |
| Icons | Lucide React | Consistent, lightweight |
| Charts | Recharts | Progress visualizations |
| PWA | next-pwa | Installable on mobile |
| Push notifications | Web Push API + service worker | Free, no Firebase needed |
| Email | Resend (3k free/month) | Verification, weekly summary |
| Hosting | Vercel + Supabase | $0/month until ~10k users |

**Total monthly cost: $0** until significant traction.

---

## 4. Project folder structure

```
english-app/
├── .github/
│   └── workflows/
│       └── ci.yml                 → lint + typecheck on PR
├── docs/
│   ├── PROJECT_PLAN.md            → this file
│   ├── PHASE_1_SETUP.md
│   ├── PHASE_2_VOCABULARY.md
│   └── ...                        → one per phase
├── supabase/
│   └── migrations/                → SQL schema versions
│       ├── 001_initial_schema.sql
│       └── 002_grammar_lessons.sql
├── public/
│   ├── manifest.json              → PWA manifest
│   └── icons/                     → app icons
├── src/
│   ├── app/                       → Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── vocabulary/
│   │   │   ├── games/
│   │   │   │   ├── spell/
│   │   │   │   ├── sentence/
│   │   │   │   ├── synonym/
│   │   │   │   └── quiz/
│   │   │   ├── grammar/
│   │   │   ├── speaking/
│   │   │   ├── writing/
│   │   │   ├── roadmap/
│   │   │   └── profile/
│   │   ├── api/
│   │   │   ├── words/
│   │   │   ├── games/
│   │   │   ├── ai/
│   │   │   ├── speaking/
│   │   │   └── progress/
│   │   ├── layout.tsx
│   │   ├── page.tsx               → landing page
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                    → shadcn primitives
│   │   ├── vocabulary/
│   │   ├── games/
│   │   ├── grammar/
│   │   └── shared/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts          → browser client
│   │   │   ├── server.ts          → server client
│   │   │   └── middleware.ts
│   │   ├── dictionary.ts          → Free Dictionary API wrapper
│   │   ├── gemini.ts              → AI wrapper
│   │   ├── speech.ts              → TTS + STT helpers
│   │   ├── spaced-repetition.ts   → SM-2 algorithm
│   │   └── utils.ts
│   ├── hooks/
│   ├── stores/                    → Zustand stores
│   ├── types/                     → shared TypeScript types
│   └── middleware.ts              → auth route guards
├── .env.local.example
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── CLAUDE.md                      → Claude Code instructions
└── README.md
```

---

## 5. Database schema

See `supabase/migrations/001_initial_schema.sql` for the full SQL.

### Core tables

- `profiles` — user info, level, XP, streak, preferred accent
- `words` — shared dictionary cache (meaning, IPA, example)
- `word_relations` — synonyms and antonyms per word
- `user_words` — personal word bank with SM-2 spaced repetition fields
- `game_sessions` — record of every game played (type, score, duration)
- `grammar_lessons` — lesson content (12 tenses + grammar topics)
- `lesson_progress` — per-user lesson completion
- `speaking_recordings` — voice clips with accuracy scores
- `ai_conversations` — chat history with the AI tutor

All user tables protected by Supabase Row Level Security (RLS).

---

## 6. API endpoints (Next.js routes)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/callback` | Supabase auth callback |
| GET | `/api/words/[word]` | Lookup word (cache + Free Dictionary API) |
| POST | `/api/words/save` | Save to user bank |
| GET | `/api/words/due` | Spaced repetition review queue |
| POST | `/api/words/review` | Submit answer, update SM-2 |
| POST | `/api/games/spell/result` | Save spell game result |
| POST | `/api/games/sentence/result` | Save sentence game result |
| POST | `/api/games/synonym/result` | Save synonym game result |
| POST | `/api/games/quiz/result` | Save quiz result |
| GET | `/api/grammar/lessons` | List lessons by level |
| GET | `/api/grammar/lessons/[slug]` | Get one lesson |
| POST | `/api/grammar/progress` | Mark lesson complete |
| POST | `/api/speaking/upload` | Upload audio to Supabase Storage |
| POST | `/api/speaking/score` | Compare with target text |
| POST | `/api/ai/chat` | Conversation partner (Gemini) |
| POST | `/api/ai/writing-feedback` | Grammar correction |
| POST | `/api/ai/sentence-rephrase` | Style transformation |
| GET | `/api/progress/dashboard` | User stats |
| GET | `/api/leaderboard/weekly` | Top XP earners |
| POST | `/api/notifications/subscribe` | Web push subscription |

---

## 7. Build roadmap (8 phases)

Each phase = one git branch → one PR → review → merge to `main`.

| # | Branch | Goal | Time |
|---|---|---|---|
| 1 | `setup/foundation` | Next.js + Supabase + auth working end-to-end | 2-3 days |
| 2 | `feature/vocabulary` | Word lookup, save, list, UK/US audio | 3-4 days |
| 3 | `feature/games-core` | Spell, sentence, synonym, quiz games | 5-7 days |
| 4 | `feature/spaced-repetition` | SM-2 algorithm + daily review queue | 2-3 days |
| 5 | `feature/grammar-lab` | 12 tenses + lessons + exercises | 5-7 days |
| 6 | `feature/speaking-ai` | Voice recording + AI conversation partner | 4-5 days |
| 7 | `feature/roadmap-progress` | Placement test + path + stats | 3-4 days |
| 8 | `feature/engagement` | Streaks, XP, badges, push notifications, PWA | 3-4 days |

**Total: ~5-6 weeks**

Each phase has its own `docs/PHASE_N_xxx.md` file with detailed acceptance criteria.

---

## 8. Workflow rules

- Never commit directly to `main`
- One feature per branch
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- Run `npm run lint && npm run typecheck` before every commit
- Open a PR when phase is complete; merge only after review
- Update relevant `docs/` markdown when behavior changes
- Tag releases: `v0.1.0` after Phase 4, `v1.0.0` after Phase 8 (public launch)

---

## 9. Code conventions

- TypeScript strict mode ON
- Server Components by default; Client Components only when needed (`"use client"`)
- Zod schemas for ALL API input validation
- Tailwind utility classes; no inline `style={{}}` unless dynamic
- File names: `kebab-case.ts` for files, `PascalCase` for React components
- Imports: `@/` alias for `src/`
- Async server actions over client-side fetches when possible
- No `any` type without an explicit `// FIXME` comment
- Errors: throw typed errors, handle at API boundary, never leak stack traces to client

---

## 10. Things to ask before doing

When working with Claude Code, it should pause and ask before:
- Adding a new npm dependency not in this plan
- Changing the database schema
- Modifying authentication flow
- Adding paid services
- Refactoring more than one module at a time
- Removing tests

---

## 11. Free-tier limits to monitor

| Service | Limit | What happens at limit |
|---|---|---|
| Vercel | 100GB bandwidth/month | Project pauses until next month |
| Supabase | 500MB DB, 1GB storage, 50k MAU | Read-only mode |
| Free Dictionary API | None official | Be polite — cache aggressively |
| Gemini API | Generous (changes often) | Falls back to error; show user-friendly message |
| Resend | 3k emails/month | Skip non-critical emails |

Cache everything possible. Lookup the same word once → store in `words` table forever.

---

## 12. Definition of done (per phase)

A phase is "done" when:
- ✅ All acceptance criteria in its `PHASE_N` doc are met
- ✅ `npm run lint` passes
- ✅ `npm run typecheck` passes
- ✅ `npm run test` passes (if tests exist for this phase)
- ✅ Manual smoke test: signup → use new feature → logout works
- ✅ Deployed preview on Vercel works
- ✅ PR merged to `main`
- ✅ Relevant docs updated

---

## 13. Out of scope for v1

These are **not** in the MVP. Park them for v2:
- Social features beyond leaderboard (friends, chat between users)
- Live group classes
- Payment / premium tier
- Mobile native apps (PWA only for now)
- Translation to other languages (English-only UI for v1)
- Custom user-created lessons
- Teacher / classroom mode

---

## 14. Future v2 ideas

- Story mode using saved vocabulary
- Idiom & phrasal verb library
- Conversation simulator with role-play scenarios (interview, restaurant, debate)
- Anki export
- Browser extension for "look up word on any page"
- Daily news article reader with vocabulary highlighting
- Voice-to-voice AI tutor (real-time)
- Group challenges and friend leaderboards

---

## 15. Quick links

- Repo: (add GitHub URL after creation)
- Live site: (add Vercel URL after first deploy)
- Supabase dashboard: (add after project creation)
- Free Dictionary API: https://dictionaryapi.dev/
- shadcn/ui: https://ui.shadcn.com/
- Supabase docs: https://supabase.com/docs
- Next.js docs: https://nextjs.org/docs

---
