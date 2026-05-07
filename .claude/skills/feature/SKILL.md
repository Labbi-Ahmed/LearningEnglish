---
name: feature
description: Scaffold a complete feature end-to-end including migration, Zod schemas, API routes, Server Component page, client component, nav link, and docs. Use when the user wants to build a new feature from scratch, add a new section to the app, or implement a full feature end-to-end.
license: MIT
compatibility: Next.js 15 App Router, TypeScript strict, Supabase, Zod, Tailwind CSS, shadcn/ui.
metadata:
  author: project
  version: "1.0"
---

Scaffold a complete, production-ready feature end-to-end. Work through each step in order. Run `npm run typecheck` after each step.

**Input**: `<feature-name> [brief description]`
**Example**: `/feature daily-goal User sets and tracks a daily vocabulary word goal`

---

## Step 0 — Read the plan before writing any code

1. Read `Project-plan/fullPlane.md` — identify which phase this belongs to
2. Read `Project-plan/DB.md` — check if tables already exist
3. Check `supabase/migrations/` — never add a column that already exists

## Step 1 — Database (skip if no new tables/columns needed)

Determine what DB changes are required. Use the `migration` skill:
- New table → create migration with table + RLS
- New column on existing table → `alter table ... add column if not exists`
- No DB changes → skip and note why

**Always remind the user**: apply the migration via Supabase dashboard → SQL Editor before testing.

## Step 2 — Zod schemas

Create `src/lib/schemas/<domain>.ts` (or extend existing) using the `schema` skill patterns:

```typescript
import { z } from "zod";

export const CreateFeatureBodySchema = z.object({
  name: z.string().min(1).max(200),
  // ...
});
export type CreateFeatureBody = z.infer<typeof CreateFeatureBodySchema>;

// Plain type for DB rows (no Zod — no runtime validation needed)
type FeatureRow = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};
```

## Step 3 — API routes

For each HTTP verb × resource, create `src/app/api/<resource>/route.ts` using the `api-route` skill pattern. Validate → Auth → RLS query → Respond.

Typical set for a CRUD resource:
```
GET    /api/<resource>          → list user's items
POST   /api/<resource>          → create
PATCH  /api/<resource>/[id]     → update (if needed)
DELETE /api/<resource>/[id]     → delete (if needed)
```

Every handler must:
1. Validate input with Zod
2. Call `supabase.auth.getUser()` and return `401` if `!user`
3. Scope every query with `.eq("user_id", user.id)`
4. Never leak stack traces to client

## Step 4 — Server Component page

Create `src/app/(dashboard)/<feature>/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FeatureClient } from "./feature-client";

type FeatureRow = { id: string; /* ... */ };

export default async function FeaturePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("<table>")
    .select("id, field_a, field_b")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const items = (data ?? []) as unknown as FeatureRow[];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Feature Title</h1>
        <p className="text-sm text-muted-foreground">One-line description.</p>
      </div>
      <FeatureClient initialItems={items} />
    </div>
  );
}
```

## Step 5 — Client Component (if interactivity is needed)

Create `src/app/(dashboard)/<feature>/feature-client.tsx` using the `component` skill pattern:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

type FeatureRow = { id: string; /* ... */ };
type Props = { initialItems: FeatureRow[] };

export function FeatureClient({ initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async (payload: CreateFeatureBody) => {
      const res = await fetch("/api/<resource>", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("create_failed");
      return res.json() as Promise<FeatureRow>;
    },
    onSuccess: (row) => {
      setItems((prev) => [row, ...prev]);
      router.refresh();
    },
    onError: () => setError("Something went wrong — try again."),
  });

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">No items yet.</p>
      )}
      {/* ... */}
    </div>
  );
}
```

## Step 6 — Nav link

Add to `src/app/(dashboard)/layout.tsx` inside the `<nav>`:

```typescript
<Link href="/<feature>" className="text-muted-foreground hover:text-foreground">
  Feature Name
</Link>
```

## Step 7 — Docs

Create `docs/PHASE_<N>_<FEATURE_NAME>.md` with:
- What was built (routes, pages, components)
- Decisions made and why
- Manual verification steps
- What this unblocks for later phases

## Step 8 — Quality gate (mandatory before finishing)

```bash
npm run lint && npm run typecheck && npm run test
```

All three must pass with zero errors. Fix anything that fails before reporting done.

## Hard rules

- Never add npm dependencies not in `Project-plan/fullPlane.md` without asking
- Never modify existing migration files — always create a new one
- Each step is independently runnable — do not mix DB work with UI work in one block
- If a step reveals a design issue, stop and describe the problem before continuing
