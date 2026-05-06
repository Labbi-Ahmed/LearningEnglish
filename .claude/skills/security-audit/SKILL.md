---
name: security-audit
description: Deep security audit of API routes and data access patterns. Use when the user wants a security review, wants to check for vulnerabilities, wants to audit authentication, wants to verify RLS policies are correct, or wants to ensure no secrets are exposed.
license: MIT
compatibility: Next.js 15 App Router, TypeScript strict, Supabase RLS, Zod input validation.
metadata:
  author: project
  version: "1.0"
---

Audit every API route and data access path for security vulnerabilities. This goes deeper than the general `/review` skill — it focuses exclusively on security.

**Input**: `[path]` (defaults to `src/app/api/`)

---

## Audit scope

Find all files matching:
- `src/app/api/**/route.ts` — API route handlers
- `src/lib/**/*.ts` — server-side lib functions
- `src/app/(dashboard)/**/page.tsx` — Server Component pages (data access)

---

## Check 1 — Authentication on every handler

For every exported HTTP function (`GET`, `POST`, `PATCH`, `DELETE`):

```
PASS: supabase.auth.getUser() called AND checked before any DB access
FAIL: No auth check at all
FAIL: Auth check is AFTER a DB query → window of unauthenticated access
FAIL: Trusting req.headers.get("x-user-id") or a cookie parsed manually
FAIL: Using the Supabase anon key and relying solely on RLS without getUser()
```

Correct pattern:
```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
// THEN query the DB
```

---

## Check 2 — RLS scoping (horizontal privilege escalation)

For every Supabase query:

```
PASS (read):   .eq("user_id", user.id)
PASS (write):  .eq("id", resource_id).eq("user_id", user.id)  ← both required
FAIL: .update({...}).eq("id", id)       ← missing user_id → any user can update any row
FAIL: .select("*").eq("id", id)         ← no user scoping → information disclosure
FAIL: insert sets user_id from body:    .insert({ user_id: body.user_id, ... })
```

For insert, `user_id` must always come from the session:
```typescript
await supabase.from("t").insert({ user_id: user.id, ...parsed.data });
```

---

## Check 3 — Input validation coverage

```
PASS: Zod .safeParse() on req.json() before any field is accessed
PASS: File type checked by MIME type; file size checked in bytes before upload
FAIL: req.json() result used directly (e.g., const { id } = await req.json())
FAIL: Size limit missing on file uploads → OOM risk
FAIL: MIME type trusted from Content-Type header alone (must validate actual type)
FAIL: Numeric query params used without coercion → NaN silently coerces to 0
```

---

## Check 4 — Error response hygiene

```
PASS: NextResponse.json({ error: "short_code" }, { status: N })
PASS: console.error("[route] context:", error.message)  ← .message only
FAIL: NextResponse.json({ error: error.stack })          ← exposes internals
FAIL: NextResponse.json({ error: error })                ← may expose DB schema
FAIL: NextResponse.json({ error: JSON.stringify(error) })
FAIL: console.error(error) then return { error: error.message } ← ok to log, bad to send
```

---

## Check 5 — Secret and credential exposure

```
PASS: GEMINI_API_KEY and SUPABASE_SERVICE_ROLE_KEY only in server-side files
FAIL: Any secret in a NEXT_PUBLIC_* variable
FAIL: getServiceRoleKey() imported in a user-facing API route
FAIL: Hardcoded API key, password, or secret in source code
FAIL: .env.local committed to git (check .gitignore)
```

---

## Check 6 — Mass assignment via object spread

```
FAIL: .update({ ...body })          ← user can overwrite any column including user_id
FAIL: .insert({ ...body, user_id })  ← user_id is correct but other columns are untrusted
PASS: .update({ field: parsed.data.field, field2: parsed.data.field2 })
```

Always list columns explicitly in update/insert.

---

## Check 7 — Supabase Storage path safety

For file upload routes:

```
PASS: path = `${user.id}/${crypto.randomUUID()}.${ext}`  ← user can't overwrite others
FAIL: path uses user-supplied filename                     ← path traversal / overwrite risk
FAIL: no content-type validation before upload
FAIL: no byte-size check before passing to storage
```

---

## Check 8 — Rate limiting / quota abuse

```
NOTE: Gemini and other AI routes have no rate limiting beyond Gemini's own limits.
      Row count checks (count rows in ai_conversations over last hour) are acceptable for MVP.
RISK: A single user could spam AI endpoints and exhaust quota for all users.
```

Flag any AI route that lacks a per-user rate limit or quota check.

---

## Output format

For each finding:

```
**[CRITICAL|HIGH|MEDIUM] Check-N: Title**
File: `src/app/api/words/route.ts:38`
Vulnerability: <what an attacker can do with this>
Fix:
```typescript
// corrected code
```
```

End with a pass/fail table:

```
| Check | Status | Notes |
|---|---|---|
| 1. Auth on every handler     | PASS / FAIL | |
| 2. RLS scoping               | PASS / FAIL | |
| 3. Input validation          | PASS / FAIL | |
| 4. Error response hygiene    | PASS / FAIL | |
| 5. Secret exposure           | PASS / FAIL | |
| 6. Mass assignment           | PASS / FAIL | |
| 7. Storage path safety       | PASS / FAIL | |
| 8. Rate limiting             | PASS / RISK | |
```

Overall risk: **Low / Medium / High / Critical**
