## Context

`GET /api/words` (`src/app/api/words/route.ts`) is the single endpoint behind both the typeahead in `vocabulary-search.tsx:88-93` and the full vocab list page. It runs:

```ts
supabase
  .from("user_words")
  .select("id, word_id, created_at, words!inner(word, pos, meaning, ipa_uk, ipa_us)")
  .order("created_at", { ascending: false })
  .range(offset, offset + limit - 1)
  .ilike("words.word", `%${q}%`)   // when q is present
```

Each call:
1. Holds a Supabase connection from the free-tier pool (~60 concurrent on Hobby).
2. Does a foreign-key join.
3. Runs a substring filter on `words.word`.

For one user this takes 5–20 ms. For hundreds of users typing concurrently, the connection pool becomes the limit — not the per-query cost.

Two Redis caches already exist:
- `word:<slug>` → shared dictionary JSON (24 h TTL).
- `user:<id>:saved` → per-user Set of word_ids (7 d TTL).

We're adding a third: `user:<id>:words:list` → per-user JSON array of the user's full saved-word objects. The substring filter runs in Node against the array.

## Goals / Non-Goals

**Goals:**
- Move both list and typeahead reads off Supabase onto Redis for the common case.
- Preserve the existing endpoint contract (response shape, `offset`/`limit` semantics, substring match).
- Single source of truth: when the cache exists it serves the read; when it doesn't, the DB does and the cache rehydrates.
- Soft-fail (Redis down → DB read works as today).

**Non-Goals:**
- Caching SM-2 review state (`next_review_at`, `ease`, etc.) — not displayed in the list page.
- Fuzzy / typo-tolerant search — substring match preserved as-is.
- Cross-user search.
- Realtime cache sync across instances — TTL + write-around invalidation is enough.

## Decisions

### 1. Cache shape: JSON array, full display fields
```ts
type SavedListEntry = {
  id: string;          // user_words.id
  word_id: string;
  word: string;
  pos: string | null;
  meaning: string | null;
  ipa_uk: string | null;
  ipa_us: string | null;
  created_at: string;
};
```
Ordered by `created_at desc` to match the existing list ordering.

- **Why full fields**: the list page renders all of them; making it fully cache-served avoids a second DB hop. Per-user payload is ~5–15 KB at typical vocab sizes (200 saved words).
- **Alternative considered**: lean cache (id + word + created_at) — saves ~70% space but forces the list page to call the DB or `word:<slug>` per row.

### 2. Filter in Node, not Redis
Substring matching runs in Node after fetching the full array. JavaScript `string.includes()` on a 500-element array is microsecond-fast.

- **Why not `ZRANGEBYLEX`**: it's prefix-only; the existing endpoint contract is substring.
- **Why not a Redis search module**: Upstash doesn't expose `RediSearch` on the free tier and adding it would couple us to a heavier infra.

### 3. Hard cap of 5000 entries per list
If a user has > 5000 saved words, skip the cache for that user and read from DB. Log a `[cache:saved-list]` warning so we notice. At that scale the DB query is still tractable and the cache trade-off (15 KB+ payload, more invalidation cost) no longer pays.

- **Why 5000**: keeps cache entries below ~150 KB. At a typical 30-char-per-entry the payload stays well below 1 MB.

### 4. Hydration pattern: read-through, write-around
- **Read**: `getSavedListFromCache(userId)` → if hit, filter + paginate in Node and return. If miss, run the existing DB query for the full list (no `q`, no `offset`/`limit`), call `putSavedListInCache`, then filter + paginate in Node and return.
- **Write (save / unsave)**: DB write first → on success, `invalidateSavedList(userId)`. The next read rehydrates from DB. This is simpler than maintaining a "splice the array in Redis" path and avoids consistency bugs.

### 5. Invalidation on every mutation that changes membership
- `POST /api/words/save` → invalidate after successful insert.
- `DELETE /api/words/[id]` → invalidate after successful delete.
- `POST /api/words/review` → **no invalidation**. SM-2 review updates `ease`, `interval`, `next_review_at` — none of which appear in the cached payload.

### 6. TTL: 7 days
Matches the `user:<id>:saved` set TTL, so both per-user caches expire together and rehydrate from the same source on next miss.

### 7. Hydrate `user:<id>:saved` opportunistically
When the cache miss path runs the full DB query, it already has every word_id for the user. Use this to ALSO call `hydrateSavedSet(userId, ids)` — saving the lazy hydration step the lookup route does today.

### 8. Soft-fail and observability
All Redis errors log with prefix `[cache:saved-list]` and the route falls back to DB. No new env vars.

### 9. Sign-in eager hydration
Two sign-in paths in this app:
- OAuth (Google) → `src/app/api/auth/callback/route.ts` (after `exchangeCodeForSession`).
- Password → `src/app/(auth)/login/actions.ts:signInAction` (after `signInWithPassword`).

Both call `void hydrateUserCachesAfterSignIn(user.id).catch(err => console.error(...))` **after** the session is set but **before** the redirect returns. The promise is intentionally not awaited so the user lands on `/dashboard` immediately; the hydration completes in the background.

The helper runs one DB SELECT for the full list, then writes `user:<id>:words:list` (via `putSavedListInCache`) and `user:<id>:saved` (via `hydrateSavedSet`) with the same TTLs as the read-path.

- **Why both entry points**: a sign-up does not redirect through the OAuth callback; password sign-in does not hit it either. Covering both gives full coverage without coupling to a single auth flow.
- **Why fire-and-forget**: blocking the redirect to wait on Redis adds 50-200 ms to every sign-in for a benefit the user can't see (the cache is just an accelerator). Background hydration is invisible.
- **Idempotency**: calling hydrate on a user whose cache is already warm is harmless — it just re-writes the same entries.

### 10. Daily user-cache refresh cron
New endpoint: `POST /api/cache/warm-users`, scheduled in `vercel.json` at `30 3 * * *` (30 min after the dictionary warm). Auth via `Authorization: Bearer <CRON_SECRET>` to match the existing cron routes. Same single-flight lock pattern (`cache:warm-users:lock`, 10-min TTL).

Algorithm:
1. Acquire lock; bail with `{ already_running: true }` if held.
2. `SELECT id FROM profiles WHERE last_active_date >= (now() - interval '14 days') ORDER BY id`.
3. Process in batches of 50 user IDs (one DB JOIN per batch, group rows by user), then `putSavedListInCache` + `hydrateSavedSet` per user.
4. Return `{ refreshed: N, batches: B }`.

- **Why 14 days active**: users who haven't opened the app in 2 weeks don't benefit from a warm cache — they'll hit the lazy/sign-in hydrate when they return. Skipping them saves commands and memory.
- **Why batch 50, not 500**: each batch joins on `words` and aggregates per user. 50 keeps the SQL plan stable and the per-batch payload small enough for a Vercel function timeout.
- **Trade-off**: Hobby tier function timeout is 10 s. For up to ~5000 active users this fits; beyond that, split the job by user-id range across multiple cron invocations (out of scope here).

## Risks / Trade-offs

- **[Risk] DB write succeeds, Redis invalidation fails** → Mitigation: 7-day TTL bounds the staleness; next miss rehydrates. Log lets us spot recurring failures.
- **[Risk] Two concurrent saves race on the invalidate** → Both call `del`; idempotent. Worst case is one extra DB read on next list view.
- **[Risk] Cache entry becomes huge for power users** → Hard cap at 5000 entries skips the cache; log + observable in Upstash console.
- **[Trade-off] Stale `created_at` ordering after a save** → Not stale: invalidation happens after every save/unsave, so the next read pulls the fresh list with the new ordering.
- **[Trade-off] Memory cost on Upstash** → ~10 MB for 1000 active users at 10 KB/entry. ~3% of the 256 MB free tier.

## Migration Plan

1. Ship the helper + endpoint changes + invalidation hooks in one PR.
2. No data migration. The cache starts empty; the first request from each user warms it.
3. Verify in production: in Upstash console after one vocab list visit, `user:<your-uuid>:words:list` should exist with ~your-saved-count entries.
4. Rollback = `git revert`. TTL cleans up cache entries naturally.

## Open Questions

- Should we precompute and store the list **sorted by `created_at desc`** AND **sorted alphabetically** so the future "sort by word A-Z" feature is free? Out of scope for now; default to `created_at desc` only.
- Do we want a metrics counter (cache hits vs misses) for tuning? Defer to a follow-up `cache-observability` change if needed.
- The 14-day active-user window is a guess. Revisit once we have real DAU data and decide whether to widen or narrow.
