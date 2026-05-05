## Context

`setup-foundation` left us with a Next.js 15 App Router project, Tailwind + shadcn primitives, Supabase auth + middleware, and the schema from `001_initial_schema.sql` already applied. The dashboard is a placeholder. This change is the first to talk to the application's own database tables (`words`, `word_relations`, `user_words`) and the first to call an external HTTP API (Free Dictionary). Constraints are budget — Free Dictionary is unmetered but rate-limited in practice, so we must cache. The user has explicitly asked that each fetch / endpoint be implementable independently so they can apply tasks one at a time.

## Goals

- Make a word looked up once cost zero outbound HTTP for the rest of time.
- Keep RLS enforcement honest: user-owned rows MUST go through the user-session client, not the service role.
- Ship the four endpoints (`GET /api/words/[word]`, `POST /api/words/save`, `GET /api/words`, `DELETE /api/words/[id]`) so each is independently shippable and testable.

## Non-Goals

- SM-2 / spaced repetition — Phase 4.
- Bulk import / CSV — out of MVP scope.
- Pre-seeding the `words` cache — words are populated lazily.
- Audio file storage in Supabase Storage — TTS uses the browser's built-in voices for free.

## Decisions

### Decision: Cache-first lookup uses the service role for `words` / `word_relations` writes

Reads of `words` and `word_relations` use the user-session server client (RLS allows public select). Writes use a service-role client, because `words` is shared and the table's RLS policy is `for select using (true)` with no insert policy — only the service role bypasses that, which matches the schema's intent that the cache is application-managed, not user-managed.

**Why not let users insert into `words`?** It would require a permissive insert policy on a shared table, which lets any authenticated user pollute the cache. Service-role-only writes keep ownership of cache hygiene with the server.

**Tradeoff**: any code path that writes to `words` must run server-side and import the service-role client carefully — never from a Client Component or a route that returns the client. We mitigate by exposing only one helper (`upsertWordFromDictionary`) that owns the service-role import.

### Decision: `POST /api/words/save` reuses the lookup pipeline rather than requiring a `word_id`

The save endpoint takes `{ word: string }`, not `{ word_id }`. This means the client does not need to call `GET /api/words/[word]` before saving — useful for "save without preview" flows later, and avoids a TOCTOU window where a cached word is purged between lookup and save.

**Tradeoff**: the save endpoint is more expensive on a cold word (it may make an outbound HTTP call) than a pure id-link. We accept this because: (a) cold-word saves are rare after the first few weeks, and (b) the alternative is duplicating the lookup contract on the client.

### Decision: Idempotent save via unique index, not pre-check

We rely on a unique constraint `(user_id, word_id)` on `user_words` (already present from `001_initial_schema.sql` — verify in task 0.x; if absent, add a new migration `002_user_words_unique.sql`). The save endpoint uses an upsert with `onConflict: 'user_id,word_id', ignoreDuplicates: true` and returns `{ already: true }` when the insert is a no-op.

**Why not select-then-insert?** Two concurrent saves would race; the unique index makes the database the source of truth.

### Decision: TanStack Query is introduced now, not deferred

The vocabulary bank list needs caching, optimistic updates on save, and invalidation on delete. Hand-rolling that on top of `fetch` is more code than just installing `@tanstack/react-query` (which is in the locked stack anyway). The provider mounts at `(dashboard)/layout.tsx` so future phases inherit it.

### Decision: Browser TTS, not stored audio

`speechSynthesis` is free, voice-rich (UK + US present on every modern browser), and avoids the Supabase Storage 1GB cap. Trade-off: voice quality varies by OS/browser. Acceptable for MVP — the plan locks this choice (`Project-plan/fullPlane.md` §3, "Audio (TTS): Browser SpeechSynthesis API").

### Decision: One DELETE route, not a "saved/[wordId]" route

`DELETE /api/words/[id]` takes a `user_words.id`, not a `word_id`. RLS handles ownership; the route is a thin wrapper. We keep `[id]` distinct from `[word]` by living at `/api/words/[id]/route.ts` with a UUID-shaped param vs `/api/words/[word]/route.ts` with a slug-shaped param — Next.js routes them by file, not by regex, so we use a small zod-uuid check at the top of the DELETE handler to disambiguate at runtime. (Lookup `[word]` rejects UUID-shaped inputs with `400` to keep the contract crisp.)

**Alternative considered**: `DELETE /api/words/saved/[id]`. Rejected because it adds a path segment for no semantic gain — `user_words.id` already namespaces the row.

### Decision: Order tasks so each fetch is its own commit

Per the user's request, `tasks.md` is structured so groups 3, 4, 5, 6 each correspond to exactly one endpoint (lookup, save, list, delete) plus its UI integration, and each can be applied, tested, and merged before the next. Group 1 (deps + provider) and Group 2 (dictionary wrapper + speech helper) are shared prerequisites — they ship before the endpoints but contain no fetch code themselves.

## Risks / Trade-offs

- **Free Dictionary API outage**: medium risk. Mitigation — cache-first means existing users keep working; lookup endpoint returns `502 lookup_unavailable` so the UI can show a clear message rather than a generic error.
- **Service-role key in API routes**: standard pattern, but a misuse (importing it into a Client Component) leaks the key. Mitigation — the service-role client lives in `src/lib/supabase/admin.ts` and the file starts with `import 'server-only'` to make accidental client import a build-time error.
- **No unique index on `user_words(user_id, word_id)`**: if `001_initial_schema.sql` does not already have it, the upsert pattern is unsafe. Mitigation — task 0.1 verifies and, if missing, adds `002_user_words_unique.sql`. (Per CLAUDE.md, never edit existing migrations.)

## Migration Plan

This change adds at most one new migration (`002_user_words_unique.sql`) and only if the `(user_id, word_id)` unique constraint is missing. No data backfill required.

## Open Questions

- Should the lookup endpoint cache 404s (word-not-found) to prevent repeat upstream calls for misspellings? Decision deferred — out of scope; revisit after observing real traffic.
