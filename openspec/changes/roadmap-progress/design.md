## Context

Schema and feature areas are all in place. This phase is mostly aggregation queries plus UI. No new external dependencies beyond Recharts.

## Goals

- Two endpoints (placement, stats), each its own apply-able fetch.
- One dashboard rewrite that pulls everything together.
- Single source of truth for roadmap thresholds.

## Non-Goals

- AI-driven study plans.
- Leaderboards (Phase 8).
- Adaptive testing — placement is a static bank.

## Decisions

### Decision: Static placement bank, not generated

A 12–15-question hand-curated bank is enough for MVP. Generating questions via Gemini introduces variance and quota cost without obvious learner benefit. Bank lives in `lib/placement/questions.ts`.

### Decision: Stats endpoint returns one big payload, not many small ones

The dashboard renders ~6 panels. One round-trip is cheaper than six and simpler to invalidate via TanStack Query. The trade-off is an N+1 risk inside the handler — mitigate with a single `select count(*) ... group by` style query per table.

### Decision: `streak.current_days` is a placeholder until Phase 8

The stats endpoint includes the field with value 0. Phase 8 owns the column/computation. Including the key now means Phase 8's UI changes are zero.

### Decision: Recommendation is rule-based, not learned

Five-rule cascade documented in the spec. Cheap, predictable, and easy to test. Learnable later.

## Risks / Trade-offs

- **Stats query cost as data grows**: counts on `game_sessions` and `user_words` are O(n) per user. With moderate per-user volume (hundreds of rows), this is fine for free-tier Postgres. Revisit at 10x.
- **Threshold tuning**: the values in `roadmap/thresholds.ts` are guesses. Make them easy to change.

## Migration Plan

No schema changes.
