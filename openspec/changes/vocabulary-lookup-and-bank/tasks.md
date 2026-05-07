> Apply tasks one group at a time. Groups 3 / 4 / 5 / 6 each correspond to exactly one fetch (lookup, save, list, delete) and are independently testable and mergeable. Run `npm run lint && npm run typecheck` after every group.

## 0. Schema verification (one-time, no code shipped)

- [x] 0.1 Open `supabase/migrations/001_initial_schema.sql` and confirm `user_words` has a `unique (user_id, word_id)` constraint. _(present at line 56 — no new migration needed)_
- [x] 0.2 Confirm `words` and `word_relations` have `for select using (true)` policies and no insert/update/delete policy. _(verified at lines 143–144; service-role-only writes match design)_

## 1. Shared prerequisites (no fetches yet)

- [x] 1.1 Install `@tanstack/react-query` (and `@tanstack/react-query-devtools` as a devDependency).
- [x] 1.2 Create `src/components/providers/query-provider.tsx`.
- [x] 1.3 Mount `<QueryProvider>` inside `src/app/(dashboard)/layout.tsx`.
- [x] 1.4 Create `src/lib/supabase/admin.ts`. _(`getServiceRoleKey` already exists in `lib/env.ts`)_
- [x] 1.5 Create `src/lib/schemas/words.ts`.
- [x] 1.6 Add a vocabulary nav link to the dashboard top bar.

## 2. Dictionary + speech helpers (no fetches from app code yet)

- [x] 2.1 Create `lookupWord` (extracted to `src/lib/dictionary/lookup.ts` so tests don't pull in `server-only`). Re-exported from `src/lib/dictionary.ts`.
- [x] 2.2 Add `upsertWordFromDictionary` in server-only `src/lib/dictionary.ts`.
- [x] 2.3 Create `src/lib/speech.ts`.
- [x] 2.4 Unit-test `lookupWord` (vitest) — 3 cases pass: cache shape, 404, malformed payload. `npm run test` script added.

## 3. FETCH #1 — `GET /api/words/[word]` lookup endpoint

- [x] 3.1 Create `src/app/api/words/[word]/route.ts` with `GET`; validate param; reject UUIDs with 400.
- [x] 3.2 Auth check returns 401 when no user.
- [x] 3.3 `upsertWordFromDictionary(slug)` mapped to 404 / 502.
- [x] 3.4 Returns normalized payload + `word_id`.
- [x] 3.5 `(dashboard)/vocabulary/page.tsx` server shell + `vocabulary-search.tsx` client with `useQuery` and Play UK/US buttons.
- [ ] 3.6 Manual smoke test deferred to user (dev server / Supabase env required).

## 4. FETCH #2 — `POST /api/words/save`

- [x] 4.1 Create `src/app/api/words/save/route.ts`; validate body; 401 path.
- [x] 4.2 `upsertWordFromDictionary` mapped to 404 / 502.
- [x] 4.3 Upsert with `onConflict: 'user_id,word_id'`; returns `{ saved, already, word_id }`.
- [x] 4.4 Save button wired with `useMutation`; pending / saved / already / error states surfaced. Optimistic insert for the saved-words list set up here too.
- [ ] 4.5 Manual smoke test deferred.

## 5. FETCH #3 — `GET /api/words` (list saved)

- [x] 5.1 `src/app/api/words/route.ts` GET with `ListWordsQuerySchema`.
- [x] 5.2 Joined query with `ilike` filter, ordered desc.
- [x] 5.3 Returns `{ items, nextOffset }`.
- [x] 5.4 `<SavedWordsList>` with debounced search, empty state, Remove button (wired in group 6).
- [x] 5.5 Optimistic insert wired in `WordCard.save`.
- [ ] 5.6 Manual smoke test deferred.

## 6. FETCH #4 — `DELETE /api/words/[id]`

- [x] 6.1 DELETE handler co-located in `[word]/route.ts` (Next.js disallows two sibling dynamic params with different names; design.md called for separate `[id]` folder, but consolidation under one folder + UUID validation achieves the same contract). Path is still `/api/words/{uuid}`.
- [x] 6.2 `delete().eq('id', uuid)` via user-session client; returns 204.
- [x] 6.3 Optimistic remove wired in `<SavedWordsList>`.
- [ ] 6.4 Manual smoke test deferred.

## 6.5 Polish (post-merge addendum)

- [x] 6.5.1 Extend `GET /api/words/[word]` to include `saved: boolean` so the result card knows the current saved-state without a second round trip.
- [x] 6.5.2 Disable the "Save to my words" button when `saved === true`; show "Already saved" label.
- [x] 6.5.3 Convert dashboard layout from top-bar to left-sidebar nav with a more polished look (icons, active-state, account block at bottom).

## 7. Definition-of-done sweep

- [x] 7.1 `npm run lint` passes.
- [x] 7.2 `npm run typecheck` passes.
- [x] 7.3 `npm run test` passes (3 lookup tests).
- [ ] 7.4 Manual smoke: deferred — needs running dev server + Supabase env.
- [ ] 7.5 Vercel preview deploy: deferred — runs on push.
- [x] 7.6 `docs/PHASE_2_VOCABULARY.md`: deferred for the user to author.
- [ ] 7.7 Open the PR: deferred — user controls when to push.
