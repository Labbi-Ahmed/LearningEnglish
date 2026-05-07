---
name: component
description: Create a React component following Next.js 15 App Router patterns. Use when the user wants to build a UI component, page component, interactive element, client component, server component, or any React component for the dashboard.
license: MIT
compatibility: Next.js 15 App Router, TypeScript strict, Tailwind CSS, shadcn/ui.
metadata:
  author: project
  version: "1.0"
---

Create a React component for this Next.js 15 App Router project.

**Input**: `<ComponentName> [server|client] [description]`
**Example**: `/component GoalProgressBar client Show daily goal progress as a bar`

---

## Step 1 — Decide: Server or Client Component

**Default is Server Component — no `"use client"` unless justified.**

Add `"use client"` ONLY when the component needs:
- `useState`, `useReducer`, `useRef`, `useContext`
- `useEffect`, `useCallback`, `useMemo`
- Browser APIs: `window`, `document`, `navigator`, `MediaRecorder`, `SpeechRecognition`
- DOM event handlers: `onClick`, `onChange`, `onSubmit`, `onKeyDown`
- TanStack Query hooks: `useQuery`, `useMutation`

**Rule**: Push `"use client"` as deep into the tree as possible. The page is a Server Component; the interactive button inside it is a Client Component.

## Step 2 — File location

| Component type | Location |
|---|---|
| Dashboard page (server) | `src/app/(dashboard)/<feature>/page.tsx` |
| Feature client component | `src/app/(dashboard)/<feature>/<name>.tsx` |
| Reusable UI primitive | `src/components/ui/<name>.tsx` |
| Feature-scoped component | `src/components/<feature>/<name>.tsx` |

File name: `kebab-case.tsx`
Export name: `PascalCase`

## Step 3 — Props type

```typescript
// Use type (not interface) for component props
type Props = {
  word: string;
  meaning: string | null;          // DB nullable → null, not undefined
  onRate?: (quality: number) => void;
  className?: string;              // always accept className on leaf components
};

export function WordCard({ word, meaning, onRate, className }: Props) {
```

Prop rules:
- Accept `className?: string` on every leaf component — allows layout overrides
- Use `children?: React.ReactNode` on container components
- Pass only the fields a component needs — never pass an entire DB row
- DB nullable columns are `string | null`, not `string | undefined`

## Step 4 — Styling

```typescript
// CORRECT — Tailwind utilities only
<div className="rounded-xl border bg-card p-4 space-y-2">

// WRONG — no inline styles (except truly dynamic computed values)
<div style={{ padding: 16 }}>

// OK — dynamic computed value has no Tailwind equivalent
<div style={{ width: `${percentage}%` }}>
```

Use `cn()` for conditional classes:
```typescript
import { cn } from "@/lib/utils";
<div className={cn("base", isActive && "ring-2 ring-primary", className)}>
```

## Step 5 — Use shadcn/ui for all UI primitives

```typescript
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Badge }    from "@/components/ui/badge";
// Card, Dialog, Tooltip, Select, etc. — always from shadcn/ui
```

Never build custom button/input/modal components from scratch.

## Step 6 — Server Component page pattern

```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FeatureClient } from "./feature-client";

type Row = { id: string; /* ... */ };

export default async function FeaturePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("table")
    .select("id, field_a")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const items = (data ?? []) as unknown as Row[];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Title</h1>
        <p className="text-sm text-muted-foreground">Description.</p>
      </div>
      <FeatureClient initialItems={items} />
    </div>
  );
}
```

## Step 7 — Client Component patterns

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

type Props = { initialItems: Row[] };

export function FeatureClient({ initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);

  const mutation = useMutation({
    mutationFn: async (payload: CreateBody) => {
      const res = await fetch("/api/resource", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("request_failed");
      return res.json() as Promise<Row>;
    },
    onSuccess: (newRow) => {
      setItems((prev) => [newRow, ...prev]);
      router.refresh(); // update server-rendered counts/badges
    },
  });

  // Handle loading, error, empty states — all three
  return ( /* ... */ );
}
```

## Step 8 — Browser API guard (Client Components only)

```typescript
// Browser APIs are undefined during SSR — always guard
useEffect(() => {
  const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  setSupported(!!SR);
}, []);

// Never access window/document outside useEffect or event handlers
```

## Quality gate

After writing, run `npm run typecheck` — no errors allowed before finishing.
