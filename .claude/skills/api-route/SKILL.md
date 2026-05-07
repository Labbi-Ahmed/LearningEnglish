---
name: api-route
description: Create a secure Next.js 15 API route with Zod validation, authentication, and RLS-scoped Supabase queries. Use when the user wants to add an API endpoint, create a route handler, build a backend API, or implement a REST endpoint.
license: MIT
compatibility: Next.js 15 App Router, TypeScript strict, Supabase, Zod.
metadata:
  author: project
  version: "1.0"
---

Create a complete, production-ready Next.js 15 App Router API route.

**Input**: `<HTTP_METHOD> <path> [short description]`
**Example**: `/api-route POST /api/goals/create Create a daily vocabulary goal`

---

## Step 1 — Locate or create the Zod schema

Check `src/lib/schemas/` for an existing file for this domain.
- If one exists, add the new schema to it.
- If not, create `src/lib/schemas/<domain>.ts`.

Schema rules:
- Request body → `<Action>BodySchema` (e.g. `CreateGoalBodySchema`)
- Query params → `<Action>QuerySchema`
- Use `z.coerce.number()` for numeric query params (they arrive as strings)
- Use `.default()` for optional params
- Always export both schema and derived type: `export type T = z.infer<typeof TSchema>`
- No `z.any()` — every field must be typed

## Step 2 — Write the route handler

**File**: `src/app/api/<path>/route.ts`

**Mandatory structure — always in this order**:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { XyzBodySchema } from "@/lib/schemas/<domain>";
// other lib imports last

export async function <METHOD>(req: Request) {
  // 1. Parse + validate input
  // 2. Authenticate
  // 3. Business logic / DB query (RLS-scoped)
  // 4. Return typed response
}
```

### 1. Parsing and validation

JSON body:
```typescript
let body: unknown;
try {
  body = await req.json();
} catch {
  return NextResponse.json({ error: "invalid_json" }, { status: 400 });
}
const parsed = XyzBodySchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: "invalid_body" }, { status: 400 });
}
```

Query params:
```typescript
const url = new URL(req.url);
const parsed = XyzQuerySchema.safeParse({
  limit: url.searchParams.get("limit") ?? undefined,
});
if (!parsed.success) {
  return NextResponse.json({ error: "invalid_query" }, { status: 400 });
}
```

### 2. Authentication — mandatory on EVERY route, BEFORE any DB access

```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
```

### 3. DB queries — always RLS-scoped

```typescript
// READ: always filter by user_id
const { data, error } = await supabase
  .from("table_name")
  .select("id, field_a, field_b")        // explicit columns — never select("*")
  .eq("user_id", user.id)
  .maybeSingle();                          // maybeSingle() not single() unless guaranteed

// WRITE: filter by BOTH id AND user_id — prevents horizontal privilege escalation
const { data: row, error } = await supabase
  .from("table_name")
  .update({ field: value })
  .eq("id", parsed.data.id)
  .eq("user_id", user.id)
  .select("id, field")
  .single();
```

Typing Supabase join results (never `as any`):
```typescript
type Row = {
  id: string;
  related: { field: string };   // !inner join → object, NOT array
};
const rows = (data ?? []) as unknown as Row[];
```

### 4. Error responses — never leak stack traces to client

```typescript
if (error) {
  console.error("[route-name] failed:", error.message); // .message only — not the raw object
  return NextResponse.json({ error: "query_failed" }, { status: 500 });
}
```

## Status code reference

| Situation | Code |
|---|---|
| Success (read / updated) | 200 |
| Success (created) | 201 |
| Validation failure | 400 |
| Unauthenticated | 401 |
| Forbidden | 403 |
| Not found (or RLS hides it) | 404 |
| File too large | 413 |
| Wrong content-type | 415 |
| Server / DB error | 500 |
| AI / external service unavailable | 503 |

## Hard rules

- `createClient()` is always `await`ed — it is async
- Never import `getServiceRoleKey()` in user-facing API routes
- Auth check must come BEFORE any DB query — no window of unauthenticated access
- Never spread user input into `.update({ ...body })` — list columns explicitly
- After writing, run `npm run typecheck` and fix all errors before finishing
