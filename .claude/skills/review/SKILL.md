---
name: review
description: SOLID principles, security, TypeScript strict, Next.js patterns, and Supabase best practices code review with file:line references and concrete fixes. Use when the user wants to review code quality, check for bugs, audit a file or directory, ensure best practices, or get a code review.
license: MIT
compatibility: Next.js 15 App Router, TypeScript strict, Supabase, Zod, SOLID principles.
metadata:
  author: project
  version: "1.0"
---

Perform a thorough code review. Report issues with `file:line` references and a concrete fix for each one. Group by severity: **Critical → High → Medium → Low**.

**Input**: `[file-or-directory]` (defaults to all changes since last commit)

---

## Checklist

### 1. Security — Critical (these block shipping)

**Auth on every route**
- Every exported HTTP handler (`GET`, `POST`, `PATCH`, `DELETE`) calls `supabase.auth.getUser()` and returns `401` if `!user`
- Auth check comes BEFORE any DB query — no window of unauthenticated access
- No route trusts headers (`x-user-id`) instead of `.getUser()`

**RLS scoping — no horizontal privilege escalation**
- Every `.select()` has `.eq("user_id", user.id)` or the table's RLS policy enforces it
- Every `.update()` / `.delete()` has BOTH `.eq("id", resource_id)` AND `.eq("user_id", user.id)`
- Insert operations set `user_id: user.id` explicitly — never trust a client-supplied `user_id`

**Input validation**
- All API inputs go through Zod `.safeParse()` before any use
- File uploads check MIME type AND byte size before processing
- No user-controlled value used in a storage path without sanitization

**Error response hygiene**
- `console.error` logs `.message` only — never `error.stack` or the raw error object
- Client-facing errors are short codes: `{ error: "not_found" }` — no stack traces, no DB messages
- RLS-hidden rows return `404`, not `403` — never confirm resource existence to unauthorized callers

**Secret exposure**
- `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` never appear in `NEXT_PUBLIC_*` variables
- `getServiceRoleKey()` is never imported in user-facing API routes

---

### 2. SOLID principles

#### S — Single Responsibility
- Each API route handles one resource and one HTTP method
- Each React component renders one concept and does not mix fetching with rendering logic
- Each lib file covers one domain (`lib/gemini.ts`, `lib/spaced-repetition.ts`)
- **Violation signal**: a file doing 3+ unrelated things; a component over 150 lines with mixed concerns

#### O — Open/Closed
- New behaviour is added by composing existing code, not by inserting `if/else` chains into existing functions
- Components use `children`, `className`, or callback props for customisation — not an internal `variant` switch that grows indefinitely
- **Violation signal**: a PR adds a feature by modifying the internals of an existing route or component rather than wrapping it

#### L — Liskov Substitution
- No subtype removes properties from its parent; no `Omit<Parent, "required_field">` used as a drop-in replacement
- TypeScript generics are used correctly — no widening to `any` or `object` to make types "work together"
- **Violation signal**: a cast that changes the effective type of something to make a call compile

#### I — Interface Segregation
- Props pass only the fields a component actually uses — not an entire DB row
- `Pick<Row, "field1" | "field2">` used instead of bundling 10 fields when 2 are needed
- API responses return only what the caller needs — no over-fetching
- **Violation signal**: a component that receives a 10-field object but only reads 2 fields

#### D — Dependency Inversion
- API routes call lib functions for domain logic — they do not contain business logic directly
- Lib functions that need Supabase either accept it as a parameter or create their own client — no singleton imports that prevent testing
- Components receive data as props from Server Components — they do not fetch data themselves (except mutations via `useMutation`)
- **Violation signal**: a component importing `createClient` and running a query directly

---

### 3. TypeScript strictness

- No `as any` without a `// FIXME:` comment with a reason and removal plan
- Array index access uses optional chaining: `items[0]?.field` (project has `noUncheckedIndexedAccess`)
- Supabase responses cast via `as unknown as T[]` — never `as T[]` directly
- No `!` non-null assertions without a preceding guard that guarantees non-null
- Zod schema and `z.infer<>` type are co-located — no separately defined duplicate types
- Browser API usage is inside `useEffect` or guarded by `typeof window !== "undefined"`

---

### 4. Next.js 15 App Router patterns

- Pages and layouts are Server Components by default — `"use client"` added only when justified
- `"use client"` is placed as deep in the component tree as possible
- `createClient()` is always `await`ed — it is async in this project
- Client Components use TanStack Query for server state, not `useState + useEffect + fetch`
- `router.refresh()` called after mutations that update server-rendered counts or badges
- Page components call `redirect("/login")` before any data access when user is null

---

### 5. Supabase patterns

- `.single()` only when row existence is guaranteed; `.maybeSingle()` otherwise
- Every Supabase `error` is checked and handled — no silent failures
- Joined tables typed as objects (`{ words: { word: string } }`), not arrays
- `select()` lists explicit columns — no `select("*")` in production routes
- `insert()` chains `.select().single()` only when the new row is needed in the response

---

### 6. Performance

- No N+1 queries — related data fetched in a single join, not a loop
- Gemini calls have a cache check before hitting the API (`ai_rephrase_cache`)
- Dictionary API lookups check the `words` table first — words cached forever
- No blocking computation in Server Components that delays page render

---

## Output format

For each issue:

```
**[CRITICAL|HIGH|MEDIUM|LOW] <Category>: <Short title>**
`src/app/api/words/route.ts:42`
Problem: <what is wrong and why it matters>
Fix:
```typescript
// concrete corrected code
```
```

End with a summary table:

```
| Severity | Count |
|---|---|
| Critical | N |
| High     | N |
| Medium   | N |
| Low      | N |
```

If a category has no issues, state "No issues found" — do not silently skip it.
