## Context

### Tier system (existing)
`src/lib/quotas/limits.ts` defines `Tier = "free" | "pro" | "pro_max" | "author"`. Server-side `getTier(supabase, userId)` reads `user_subscriptions.tier`. The layout already fetches tier to check `isAuthor`; we extend that to also expose a `isFree` boolean.

### AI-gated pages (existing)
| Route | AI capability | API routes gated |
|---|---|---|
| `/chat` | AI tutor chat | `POST /api/ai/chat` |
| `/writing` | Grammar feedback + rephrase | `POST /api/ai/writing-feedback`, `POST /api/ai/sentence-rephrase` |
| `/speaking` | AI accuracy scoring | `POST /api/speaking/score`, `POST /api/speaking/upload` |

All three pages already import `QuotaIndicator` and use Gemini via server routes. The gate prevents free users reaching the client components that make those calls.

### Pronunciation bug (existing)
`pickVoice()` in `src/lib/speech.ts` calls `getVoices()` and returns `null` if the list is empty. Chrome populates the list asynchronously and fires `speechSynthesis.onvoiceschanged` when ready. On page load, the first `speak()` call finds zero voices, `utter.voice` is never set, and the browser uses its default voice — often not English, often wrong accent. Firefox loads voices synchronously so it is unaffected.

---

## Goals / Non-Goals

**Goals:**
- Free users see a "Pro" badge on locked nav items and a gate wall on the pages — zero Gemini/upload API calls possible from free tier.
- `speak()` reliably picks the correct accent voice on Chrome on first call.
- Pro/Pro Max/Author users see no gate and no badge.

**Non-Goals:**
- Actual payment or upgrade flow (gate CTA says "coming soon").
- Gating non-AI features (games, vocabulary, review, grammar).
- Changing quota enforcement on the server side (already correct).

---

## Decisions

### 1. Tier read in layout, passed as prop to nav components
The layout server component already fetches `user_subscriptions.tier` for the `isAuthor` check. Extend that query result to derive `isFree = tier === "free"`. Pass `isFree` to both `MobileNav` and to the sidebar nav render so they can show `ProBadge` next to locked items.
- **Why**: single DB read for tier, already in the critical path. No new server calls.
- **Alternative**: each nav item does its own fetch — extra DB round-trips, overkill.

### 2. ProBadge is a pure presentational component
`src/components/pro-badge.tsx` — a `<span>` with a gold/amber background, "Pro" text, small size. No state, no client directive needed.

### 3. Locked nav items are still links (not disabled buttons)
The nav items for `/chat`, `/writing`, `/speaking` remain `<Link>` components — free users can still navigate there. The gate is enforced server-side on the page, not in the nav. This matches standard SaaS patterns (Notion, Linear) where the link is accessible but the content is locked.
- **Why**: prevents confusing "dead" nav items and gives a better discovery/upgrade moment at the page level.
- **Badge placement**: the `ProBadge` appears as `ml-auto` on the nav item row so it doesn't displace the icon/label.

### 4. ProGate component
`src/components/pro-gate.tsx` — a server-renderable centered card:
- Lock icon (🔒 emoji or Lucide `Lock`)
- Title: "Pro feature"
- Description: one sentence about the feature (passed as prop)
- CTA button: "Upgrade to Pro — coming soon" (disabled, styled as outline)
- No `"use client"` needed — purely static HTML.

### 5. Page-level gate check (server component)
Each gated page (`/chat/page.tsx`, `/writing/page.tsx`, `/speaking/page.tsx`) fetches tier and conditionally renders either `<ProGate>` or the real client component. The real client component is never imported/rendered for free users, so no hydration of AI-calling code happens.

```tsx
// Pattern used in all three pages
const tier = await getTier(supabase, user.id);
if (tier === "free") {
  return <ProGate feature="AI tutor chat" description="..." />;
}
return <ChatWindow />;
```

### 6. Pronunciation fix — promise-based voice loader
Extract a `getVoicesReady(): Promise<SpeechSynthesisVoice[]>` helper:
- If `getVoices()` returns a non-empty array → resolve immediately (Firefox / warm Chrome).
- Otherwise, attach a one-time `voiceschanged` listener → resolve when it fires (Chrome first call).
- Timeout fallback: if `voiceschanged` never fires within 2 s, resolve with whatever `getVoices()` returns at that point (edge case: browser with no TTS support at all).

`speak()` becomes `async` internally but its public signature stays `speak(text, accent): void` — it fires-and-forgets the promise so all existing call sites work unchanged.

### 7. No changes to MobileNav `signOutAction` prop type
The mobile nav already accepts `signOutAction: () => void | Promise<void>`. We add `isFree: boolean` to its props. No breaking change to existing prop contract.

---

## Component API

```tsx
// src/components/pro-badge.tsx
export function ProBadge() // → <span> chip, no props needed

// src/components/pro-gate.tsx
interface ProGateProps {
  feature: string;       // e.g. "AI tutor chat"
  description: string;   // one sentence
}
export function ProGate({ feature, description }: ProGateProps)

// MobileNav (extended)
type Props = {
  // ...existing props...
  isFree: boolean;  // NEW
}

// layout.tsx sidebar (inline change, no new component)
// Pass isFree to sidebar nav render and to <MobileNav isFree={isFree} />
```

## Pronunciation fix — speech.ts rewrite sketch

```ts
function getVoicesReady(): Promise<SpeechSynthesisVoice[]> {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) return Promise.resolve(voices);
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(window.speechSynthesis.getVoices()), 2000);
    window.speechSynthesis.addEventListener("voiceschanged", () => {
      clearTimeout(timeout);
      resolve(window.speechSynthesis.getVoices());
    }, { once: true });
  });
}

export function speak(text: string, accent: Accent): void {
  if (!isSupported() || !text) return;
  void getVoicesReady().then((voices) => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const prefix = accent === "uk" ? "en-GB" : "en-US";
    const voice = voices.find(v => v.lang.startsWith(prefix))
      ?? voices.find(v => v.lang.startsWith("en"))
      ?? null;
    if (voice) utter.voice = voice;
    utter.lang = accent === "uk" ? "en-GB" : "en-US";
    utter.rate = 0.95;
    window.speechSynthesis.speak(utter);
  });
}
```

## File Changes

| File | Change |
|---|---|
| `src/components/pro-badge.tsx` | **New** — "Pro" chip |
| `src/components/pro-gate.tsx` | **New** — locked page wall |
| `src/lib/speech.ts` | **Rewrite** — async voice loading |
| `src/app/(dashboard)/layout.tsx` | Derive `isFree`, pass to nav |
| `src/components/nav/mobile-nav.tsx` | Accept + render `isFree` + `ProBadge` |
| `src/app/(dashboard)/chat/page.tsx` | Gate free users with `ProGate` |
| `src/app/(dashboard)/writing/page.tsx` | Gate free users with `ProGate` |
| `src/app/(dashboard)/speaking/page.tsx` | Gate free users with `ProGate` |

## Risks / Trade-offs

- **[Low] voiceschanged timeout**: 2 s fallback is generous. If a browser never fires the event and has no voices, `speak()` silently no-ops — same behaviour as today.
- **[Low] Free user navigates directly to `/chat`**: handled by server-side gate in page.tsx. Cannot be bypassed from the client.
- **[None] Existing quota enforcement**: unchanged. Server routes still enforce limits for pro users.
