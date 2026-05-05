# English Learning App

A free, public English learning web app for all levels (A1 → C2). Vocabulary, games, grammar, speaking practice, AI writing feedback, and a guided roadmap — all hosted on free tiers.

> Status: pre-MVP. See [`Project-plan/fullPlane.md`](./Project-plan/fullPlane.md) for the full roadmap.

---

## Features (planned)

- 📒 Smart vocabulary notebook with auto-lookup (meanings, IPA, synonyms, antonyms)
- 🎮 Word games: spell, sentence-build, synonym match, quiz
- 📚 Grammar & tense lab covering all 12 English tenses
- 🎙️ Speaking & pronunciation practice (UK + US accents)
- ✍️ AI-powered writing feedback and conversation partner
- 🗺️ Guided learning roadmap with placement test, streaks, and XP

---

## Tech stack

Next.js 15 (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase (Postgres, Auth, Storage) · Google Gemini API · Free Dictionary API · Web Speech API · Zustand · TanStack Query · Vercel.

---

## Local setup

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.local.example .env.local
# fill in Supabase + Gemini keys

# 3. Apply database schema
# Open Supabase SQL editor → run supabase/migrations/001_initial_schema.sql

# 4. Run
npm run dev
```

App runs at http://localhost:3000.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Run tests (when added) |

---

## Project structure

See [`Project-plan/fullPlane.md` §4](./Project-plan/fullPlane.md) for the full folder map.

---

## Roadmap

| # | Phase | Status |
|---|---|---|
| 1 | Foundation (Next.js + Supabase + auth) | ⏳ |
| 2 | Vocabulary | — |
| 3 | Games (spell / sentence / synonym / quiz) | — |
| 4 | Spaced repetition (SM-2) | — |
| 5 | Grammar lab | — |
| 6 | Speaking + AI conversation | — |
| 7 | Roadmap & progress | — |
| 8 | Engagement (streaks, XP, badges, PWA, push) | — |

Phase docs live in [`docs/`](./docs).

---

## Contributing

This is a solo learning project, but PRs are welcome once v1 ships. Until then, please open an issue first to discuss.

---

## License

MIT.
