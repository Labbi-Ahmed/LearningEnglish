# OpenSpec Change Tracker

> Last updated: 2026-05-06
> All code tasks are complete. Remaining items are manual smoke tests and deploy steps that require a live browser/Supabase/Vercel environment.

---

## Summary

| Change | Phase | Code Done | Total | Manual Left | Status |
|---|---|---|---|---|---|
| setup-foundation        | Phase 1 — Auth & Setup        | 40 | 46 | 6 | ✅ Code complete |
| vocabulary-lookup-and-bank | Phase 2 — Vocabulary       | 36 | 43 | 7 | ✅ Code complete |
| games-core              | Phase 3 — Games               | 19 | 27 | 8 | ✅ Code complete |
| spaced-repetition       | Phase 4 — Spaced Repetition   | 20 | 20 | 0 | ✅ Fully complete |
| grammar-lab             | Phase 5 — Grammar             | 15 | 21 | 6 | ✅ Code complete |
| speaking-ai             | Phase 6 — Speaking & AI       | 29 | 29 | 0 | ✅ Fully complete |
| roadmap-progress        | Phase 7 — Roadmap & Dashboard | 14 | 18 | 4 | ✅ Code complete |
| engagement-pwa          | Phase 8 — Engagement & PWA    | 25 | 30 | 5 | ✅ Code complete |

---

## Changes

### setup-foundation — Phase 1: Auth & Setup
**40 / 46 tasks complete · 6 manual steps remaining**

Scaffolded the Next.js 15 App Router project, Supabase schema + RLS, middleware route guards, email/password + Google OAuth flows, and the base dashboard shell.

**Pending (manual):**
- `7.1` Smoke test: signup → confirm → login → sign out
- `7.2` Smoke test: Google OAuth → dashboard → verify `profiles` row
- `7.3` Verify route guards (unauth → `/login`, auth → `/dashboard`)
- `7.4` Push branch and confirm Vercel preview builds
- `7.5` Open PR, CI passes, merge to `main`
- `7.6` Update `Project-plan/fullPlane.md` with live Vercel + Supabase URLs

---

### vocabulary-lookup-and-bank — Phase 2: Vocabulary
**36 / 43 tasks complete · 7 manual steps remaining**

Free Dictionary API lookup with permanent caching, save/delete word bank, paginated saved-words list, typeahead from saved words, `saved: boolean` on lookup response, sidebar nav layout.

**Pending (manual):**
- `3.6` Smoke: search a word → card shows IPA, meaning, synonyms
- `4.5` Smoke: save a word → appears in bank; repeat → "Already saved"
- `5.6` Smoke: saved-words list paginates and filters
- `6.4` Smoke: delete removes word from bank
- `7.4` Smoke: full flow on running dev server
- `7.5` Vercel preview deploy
- `7.7` Open the PR

---

### games-core — Phase 3: Games
**19 / 27 tasks complete · 8 manual steps remaining**

Four vocabulary games (Spell, Sentence Builder, Synonym, Quiz) with a shared `<GameShell>`, batch endpoint, result endpoints updating `game_sessions`, and hub page showing last scores.

**Pending (manual):**
- `2.2` Hub shows "Not played yet" for fresh user
- `3.3` Batch endpoint returns correct distractor count
- `4.3` Spell: session row + `mastery_level` updated after round
- `5.3` Sentence: result row written
- `6.4` Synonym: result row written
- `7.3` Quiz: result row written
- `8.2` Play all four games; hub reflects last scores
- `8.3` Vercel preview works

---

### spaced-repetition — Phase 4: Spaced Repetition
**20 / 20 tasks complete · nothing remaining** ✅

SM-2 algorithm, due/review endpoints, review UI with quality rating, dashboard due-badge integration.

---

### grammar-lab — Phase 5: Grammar
**15 / 21 tasks complete · 6 manual steps remaining**

16 grammar lessons (A1–B2) seeded in SQL, lesson list + detail + exercise runner, progress upsert preserving max score and `completed_at`.

**Pending (manual):**
- `1.3` Apply migration via Supabase dashboard; verify `count(*) >= 16`
- `3.4` Smoke: lesson list shows correct level + completion state
- `4.3` Smoke: lesson detail renders markdown body + exercises
- `5.3` Smoke: 8/10 → completed; redo 5/10 → score stays 8, still completed
- `6.2` Complete two lessons of different levels
- `6.3` Vercel preview works

---

### speaking-ai — Phase 6: Speaking & AI
**29 / 29 tasks complete · nothing remaining** ✅

Speaking recorder (Web Speech API + audio upload), word-accuracy scoring, AI chat (Gemini), writing feedback with issue highlighting, sentence rephrase with caching, speaking/writing/chat pages and nav links.

---

### roadmap-progress — Phase 7: Roadmap & Dashboard
**14 / 18 tasks complete · 4 manual steps remaining**

Placement test (15 curated questions → CEFR band), stats dashboard with Recharts panels, 5-step roadmap page driven by `lib/roadmap/thresholds.ts`.

**Pending (manual):**
- `3.4` Smoke: take placement test → `profiles.level` updates
- `4.4` Smoke: fresh user sees zeros + CTA; after activity panels update
- `5.2` Full placement → dashboard → roadmap walk-through
- `5.3` Vercel preview works

---

### engagement-pwa — Phase 8: Engagement & PWA
**25 / 30 tasks complete · 5 manual steps remaining**

XP ledger (idempotent grants wired into all result endpoints), streak computation, 6 badge rules, `<StreakStrip>` / `<BadgeGrid>` / `<InstallCta>` / `<PushPrompt>` on dashboard, weekly leaderboard, push notifications (VAPID), daily reminder cron, weekly email digest (Resend), `@ducanh2912/next-pwa` + manifest.

**Pending (manual):**
- `5.3` Smoke: leaderboard renders ordered list with seeded XP
- `8.3` Smoke: hit daily-reminder cron with `CRON_SECRET`; push delivered
- `10.3` Verify PWA install prompt fires and app launches standalone
- `11.2` End-to-end: earn XP → streak → install PWA → push → weekly email
- `11.3` Vercel preview cron routes work (manual hit with secret)

---

## Docs Written

| File | Phase |
|---|---|
| `docs/PHASE_1_SETUP.md` | Phase 1 |
| `docs/PHASE_2_VOCABULARY.md` | Phase 2 |
| `docs/PHASE_3_GAMES.md` | Phase 3 |
| `docs/PHASE_4_SPACED_REPETITION.md` | Phase 4 |
| `docs/PHASE_5_GRAMMAR.md` | Phase 5 |
| `docs/PHASE_6_SPEAKING_AI.md` | Phase 6 |
| `docs/PHASE_7_ROADMAP.md` | Phase 7 |
| `docs/PHASE_8_ENGAGEMENT.md` | Phase 8 |
