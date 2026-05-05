# Pending Checklist — Games Core & Grammar Lab

Things that could not be completed locally and must be done before these features are considered shipped.

---

## Before running the app at all

### Install dependencies
```bash
npm install
```
> `react-markdown` and `remark-gfm` were added to `package.json` for the grammar-lab feature.

---

## Games Core (Phase 3)

### 1. Lint & type-check
```bash
npm run lint && npm run typecheck
```
Fix any errors before merging.

### 2. Manual smoke test — Games hub
- Sign in → navigate to `/games`
- All four cards show **"Not played yet"** on first visit

### 3. Manual smoke test — Spell game
- Click **Play** on the "Spell it" card
- Hear TTS audio for the first word
- Type the word → verify **correct/incorrect** feedback
- Complete a full 10-item round
- Check Supabase: one new row in `game_sessions` with `game_type = 'spell'`
- Check `user_words.mastery_level` incremented for correct items (capped at 5)
- Hub now shows last score for Spell

### 4. Manual smoke test — Sentence game
- Click **Play** on "Build a sentence"
- Shuffle tokens appear; tap to reorder
- Complete a round → verify `game_sessions` row written

### 5. Manual smoke test — Synonym game
- Click **Play** on "Find the synonym"
- If you have saved words with synonyms: 4 option buttons appear, one is correct
- If not enough eligible words: "You need at least 4 saved words" message shown

### 6. Manual smoke test — Quiz game
- Click **Play** on "Meaning quiz"
- 4 meaning options appear per word
- Complete a round → verify `game_sessions` row written

### 7. Edge cases to verify
| Scenario | Expected |
|---|---|
| User has < 4 saved words | All games show "not enough words" message |
| User not logged in hits `/api/games/words` | Returns `401` |
| Result body has `score > total` | Returns `400 invalid_result` |
| Result body references a word the user doesn't own | Returns `400 unknown_word_id` |

### 8. Antonym variant (optional / future)
The synonym game API supports `?mode=antonym` and the backend `selectForSynonym` handles it. The UI currently defaults to `mode="synonym"`. To expose antonym mode: add a toggle or separate route in `/games/synonym/page.tsx` and pass `mode="antonym"` to `<SynonymGame>`.

---

## Grammar Lab (Phase 5)

### 1. Apply the database migration
In the **Supabase dashboard → SQL Editor**, paste and run:
```
supabase/migrations/003_grammar_seed.sql
```
Then verify:
```sql
select count(*) from grammar_lessons;
-- should return 16
select slug, level, jsonb_array_length(content->'exercises') as ex_count
from grammar_lessons
order by order_index;
-- every row should have ex_count >= 5
```

### 2. Lint & type-check
```bash
npm run lint && npm run typecheck
```

### 3. Manual smoke test — Grammar hub
- Sign in → navigate to `/grammar`
- Cards appear matching your `profiles.level`
- Cards show **"Completed"** badge after finishing a lesson

### 4. Manual smoke test — Lesson detail
- Open `/grammar/present-simple`
- Markdown body renders correctly (tables, bold text, code blocks)
- 5 exercises appear: fill-in-blank input, multiple choice buttons, reorder tokens

### 5. Manual smoke test — Exercise submission
- Complete all exercises and click **Submit exercises**
- Score and pass/fail message displayed
- Check Supabase: `lesson_progress` row written with correct `score` and `completed`

### 6. Max-score retention test
- Complete a lesson with a high score (e.g. 5/5 → `completed = true`)
- Reload and submit again with fewer correct answers
- Check DB: `score` stays at the higher value; `completed_at` unchanged

### 7. Edge cases to verify
| Scenario | Expected |
|---|---|
| Unknown slug `/grammar/xyz` | Next.js 404 page |
| Unauthenticated user hits `/api/grammar/lessons` | Returns `401` |
| Lesson content JSONB is malformed in DB | Returns `500 invalid_content` |
| Score < 70% | Finish card shows "Keep practising", no `completed = true` |

### 8. `@tailwindcss/typography` (optional, recommended)
The lesson body uses Tailwind's `prose` class for markdown styling. If prose styles are not rendering:
```bash
npm install @tailwindcss/typography
```
Then add to `tailwind.config.*`:
```js
plugins: [require('@tailwindcss/typography')]
```

---

## After all checks pass

1. `npm run test` — run the Vitest suite
2. Open a PR from `secound-feature` → `develop`
3. Merge after review
4. Tag release per roadmap (`v0.1.0` after Phase 4 is complete)
