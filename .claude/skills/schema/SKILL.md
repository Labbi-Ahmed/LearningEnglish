---
name: schema
description: Create Zod schemas with TypeScript types derived via z.infer<>. Use when the user needs request/response validation schemas, input validation, API data types, or Zod schema definitions for a domain.
license: MIT
compatibility: Next.js 15 TypeScript strict, Zod v3, noUncheckedIndexedAccess enabled.
metadata:
  author: project
  version: "1.0"
---

Create or extend a Zod schema file in `src/lib/schemas/<domain>.ts`.

**Input**: `<domain-name> [what schemas are needed]`
**Example**: `/schema notifications push subscription and send payload schemas`

---

## One schema file per domain

| Domain | File |
|---|---|
| Vocabulary words | `src/lib/schemas/words.ts` |
| Spaced repetition | `src/lib/schemas/review.ts` |
| AI features | `src/lib/schemas/ai.ts` |
| Speaking practice | `src/lib/schemas/speaking.ts` |
| New domain | `src/lib/schemas/<domain>.ts` |

## Golden rule — NEVER duplicate types

Always derive TypeScript types from Zod schemas. Never write a separate `type` that mirrors a schema.

```typescript
// CORRECT — one source of truth
export const CreateGoalBodySchema = z.object({
  daily_target: z.number().int().min(1).max(100),
});
export type CreateGoalBody = z.infer<typeof CreateGoalBodySchema>;

// WRONG — type drifts from validation over time
export type CreateGoalBody = { daily_target: number };
```

## Schema naming conventions

| Purpose | Suffix | Example |
|---|---|---|
| POST/PUT request body | `BodySchema` | `CreateGoalBodySchema` |
| GET query params | `QuerySchema` | `ListGoalsQuerySchema` |
| API response shape | `ResponseSchema` | `GoalResponseSchema` |
| DB row (plain type, no Zod) | — | `type GoalRow = { ... }` |

## Validation constraints — always add them, never leave fields bare

```typescript
// Strings
z.string().min(1)                      // non-empty
z.string().min(1).max(500)             // bounded
z.string().uuid()                      // UUID format
z.string().email()                     // email format
z.string().regex(/^[a-z-]+$/, "...")  // pattern with message

// Numbers
z.number().int().min(0).max(100)       // integer, bounded
z.coerce.number().int().min(1).max(50) // coerce from string (query params always arrive as strings)

// Enums
z.enum(["formal", "casual", "simple"])

// Optional with default
z.coerce.number().int().min(1).max(50).default(20)

// UUID from path/body
z.string().uuid()
```

## DB row types — plain TypeScript type, NOT Zod

Supabase responses don't need runtime validation. Use a plain `type`:

```typescript
// Correct — plain type for DB rows
type GoalRow = {
  id: string;
  user_id: string;
  daily_target: number;
  created_at: string;
  // DB nullable columns → null, NOT undefined
  completed_at: string | null;
};

// Join result — !inner join produces an OBJECT, not array[]
type GoalWithProfile = {
  id: string;
  profiles: { display_name: string | null }; // object, not profiles[]
};
```

## noUncheckedIndexedAccess — safe array access everywhere

This project has `"noUncheckedIndexedAccess": true`. Every `arr[i]` is `T | undefined`.

```typescript
// TS ERROR under noUncheckedIndexedAccess
const first = items[0].name;
const issue = parsed.error.errors[0].message;

// CORRECT
const first = items[0]?.name ?? "";
const issue = parsed.error.errors[0]?.message ?? "invalid_input";
const last  = items.at(-1);           // returns T | undefined — handle explicitly
```

## Export pattern — always at bottom, always paired

```typescript
export const XyzBodySchema = z.object({ ... });
export type XyzBody = z.infer<typeof XyzBodySchema>;

export const XyzQuerySchema = z.object({ ... });
export type XyzQuery = z.infer<typeof XyzQuerySchema>;
```

After writing, run `npm run typecheck` — no errors allowed.
