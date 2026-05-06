---
name: ts-fix
description: Fix TypeScript errors using correct patterns for this project. Use when there are TypeScript errors, tsc failures, type issues, noUncheckedIndexedAccess errors, Supabase response type problems, browser API type declarations, or any time `npm run typecheck` fails.
license: MIT
compatibility: TypeScript strict mode, noUncheckedIndexedAccess, Next.js 15, Supabase, @google/generative-ai.
metadata:
  author: project
  version: "1.0"
---

Run `npm run typecheck`, then fix every error using the correct pattern. Never use `as any` as a first move.

---

## Step 1 — Get all errors

```bash
npm run typecheck 2>&1
```

Work through errors one at a time using the pattern reference below.

---

## Pattern reference

### Pattern 1 — `noUncheckedIndexedAccess`: array index gives `T | undefined`

**tsconfig has `"noUncheckedIndexedAccess": true`. Every `arr[i]` is `T | undefined`.**

```typescript
// TS error: Object is possibly 'undefined'
const name = items[0].name;
const msg  = parsed.error.errors[0].message;
const last = arr[arr.length - 1];

// Fix A — optional chaining + fallback
const name = items[0]?.name ?? "";

// Fix B — .at() for first/last
const first = items.at(0);    // T | undefined — still must handle
const last  = items.at(-1);   // T | undefined — still must handle

// Fix C — guard before use
const item = items[i];
if (!item) return;
use(item.name); // item is T here

// Fix D — Zod error arrays (most common in routes)
const issue = parsed.error.errors[0];
const msg   = issue?.message ?? "invalid_input";
```

### Pattern 2 — Browser APIs (`SpeechRecognition`, `MediaRecorder`, custom window props)

`SpeechRecognition` is **not** a built-in TypeScript type name. Never use `typeof SpeechRecognition`.

```typescript
// WRONG — TS error: Cannot find name 'SpeechRecognition'
interface Window { SpeechRecognition: typeof SpeechRecognition; }

// CORRECT — declare the exact shape you need
type SRAlternative = { transcript: string };
type SRResult      = { isFinal: boolean } & ArrayLike<SRAlternative>;
type SREvent       = { results: ArrayLike<SRResult> };
type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SREvent) => void) | null;
  start(): void;
  stop(): void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition:        SpeechRecognitionCtor | undefined;
    webkitSpeechRecognition:  SpeechRecognitionCtor | undefined;
  }
}
```

Usage:
```typescript
const SR  = window.SpeechRecognition ?? window.webkitSpeechRecognition;
const rec = SR ? new SR() : null;
```

### Pattern 3 — Supabase response casting

Supabase `.select()` returns `any` internally. Cast correctly — always two-step via `unknown`.

```typescript
// Simple query
type Row = { id: string; word: string; meaning: string | null };
const rows = (data ?? []) as unknown as Row[];

// Join query — !inner produces an OBJECT, not array
type UserWordRow = {
  id: string;
  words: { word: string; meaning: string | null };  // object, NOT words[]
};
const rows = (data ?? []) as unknown as UserWordRow[];

// maybeSingle result
const { data: row } = await supabase.from("t").select("id, name").eq("id", id).maybeSingle();
// row: { id: string; name: string } | null
if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
// After guard: row is non-null

// NEVER cast directly — always via unknown
const rows = data as Row[];           // WRONG
const rows = data as unknown as Row[]; // CORRECT
```

### Pattern 4 — Functions that always throw need `never` return type

```typescript
// TS error: A function returning 'never' cannot have a reachable end point
function mapError(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("429")) throw new AIQuotaError();
  throw new AIUnavailableError();
}

// Calling site — TS error: not all code paths return a value
export async function generateChat(...): Promise<string> {
  try {
    return result.response.text();
  } catch (err) {
    if (err instanceof AIQuotaError) throw err;
    mapError(err);   // mapError returns never → TS knows this path always throws
  }
}
```

### Pattern 5 — `@google/generative-ai` types

```typescript
import { GoogleGenerativeAI, type Content } from "@google/generative-ai";

// Content shape: { role: "user" | "model"; parts: Part[] }
// IMPORTANT: Gemini uses "model" not "assistant"
const history: Content[] = turns.map((t) => ({
  role: t.role as "user" | "model",
  parts: [{ text: t.content }],
}));
```

### Pattern 6 — Next.js 15 page props — params/searchParams are Promises

```typescript
// Next.js 15: params and searchParams are now Promises
type Props = {
  params:       Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
};

export default async function Page({ params }: Props) {
  const { slug } = await params; // must await
}
```

### Pattern 7 — `satisfies` operator (prefer over `as` for literal types)

```typescript
// as const gives readonly but widens type
const codes = { ok: 200, not_found: 404 } as const;

// satisfies gives literal types WITH type checking
const STATUS = {
  ok:        200,
  not_found: 404,
} satisfies Record<string, number>;
// STATUS.ok is typed as 200, not number
```

---

## What to NEVER do

| Pattern | Why it's wrong | Correct alternative |
|---|---|---|
| `value as any` | Turns off type checking entirely | Use narrowing, guard, or proper cast |
| `// @ts-ignore` | Silently suppresses errors | Fix the root cause |
| `// @ts-expect-error` without reason | Undocumented suppression | Add `// FIXME: <reason>` |
| `data as Row[]` | Skips `unknown` step — unsound | `data as unknown as Row[]` |
| `arr[0].field` | Crashes if arr is empty | `arr[0]?.field ?? default` |
| `!value` non-null assertion | Lies to TypeScript | Guard: `if (!value) return` |

Only use `// FIXME: any` when ALL of these are true:
1. No correct type exists yet
2. You've spent > 5 minutes trying
3. You document why and when to remove it

---

## Step 2 — Verify clean

```bash
npm run typecheck && npm run lint
```

Both must pass with zero errors before finishing.
