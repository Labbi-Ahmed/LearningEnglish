> Apply groups in order. Groups 3 and 4 each isolate one fetch (placement, stats). Run lint + typecheck after every group.

## 1. Shared scaffolding

- [ ] 1.1 Install `recharts`.
- [ ] 1.2 Create `src/lib/schemas/{placement,progress}.ts`.
- [ ] 1.3 Create `src/lib/placement/questions.ts` with 12–15 curated items spanning vocab/grammar/listening, plus `lib/placement/score.ts` with band logic (`a1`..`c2`).
- [ ] 1.4 Create `src/lib/roadmap/thresholds.ts` with the per-step constants.
- [ ] 1.5 Add a Roadmap nav link.

## 2. Question bank curation

- [ ] 2.1 Draft 4 a1/a2 vocab questions, 4 b1/b2 grammar questions, 3 listening questions (TTS prompt → choose meaning), 2 reading-comprehension questions. Verify per-question difficulty.

## 3. FETCH #1 — `POST /api/profile/placement`

- [ ] 3.1 Create `src/app/api/profile/placement/route.ts`. Validate body. Score against the bank. Reject unknown question ids. Update `profiles.level`.
- [ ] 3.2 Build `(dashboard)/placement/page.tsx` walking the questions one at a time with a finish summary on submit.
- [ ] 3.3 Add a "Take the placement test" CTA on the dashboard for users with no prior submission (heuristic: `profiles.level = 'a1'` AND zero `lesson_progress` rows).
- [ ] 3.4 Manual smoke: take the test, confirm `profiles.level` updates.

## 4. FETCH #2 — `GET /api/progress/dashboard`

- [ ] 4.1 Create `src/app/api/progress/dashboard/route.ts`. Run aggregate queries against the user's tables. Return the documented shape.
- [ ] 4.2 Replace `(dashboard)/dashboard/page.tsx` with the new home: greeting, level chip, due badge, stats panels (Recharts), recommended-next.
- [ ] 4.3 Build `(dashboard)/roadmap/page.tsx` reading the same stats and rendering the 5-step path using `lib/roadmap/thresholds.ts`.
- [ ] 4.4 Manual smoke: as a fresh user, dashboard shows zeros and "Take placement"; after activity, panels and roadmap update.

## 5. Definition-of-done

- [ ] 5.1 Lint / typecheck / test pass.
- [ ] 5.2 Manual: full placement → dashboard → roadmap walk-through.
- [ ] 5.3 Vercel preview works.
- [ ] 5.4 Update `docs/PHASE_7_ROADMAP.md`.
