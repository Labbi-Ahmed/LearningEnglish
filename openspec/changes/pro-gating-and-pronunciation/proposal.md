## Why

Two unrelated but both-needed fixes:

**1. Pro gating** — Free-tier users can currently navigate to `/chat`, `/writing`, and `/speaking`, fill out forms, and hit API endpoints. They get blocked only after the server burns a quota slot. There is no upfront signal that these are premium features, no visual distinction in the nav, and no prevention of API calls from the UI. This wastes Gemini free-tier quota on every rejected request and gives users a confusing "quota exceeded" error rather than a clear "upgrade to Pro" message.

**2. Pronunciation audio** — `src/lib/speech.ts` calls `window.speechSynthesis.getVoices()` synchronously at call time. On Chrome (the dominant browser), the voice list is loaded asynchronously and `getVoices()` returns an empty array on the first call. The result: clicking the speaker button on any word produces either silence or a plain default voice with no accent selection. Users think pronunciation is broken.

## What Changes

### Pro gating
- Add a `ProBadge` chip component (`src/components/pro-badge.tsx`) — a small "Pro" label shown inline next to locked nav items.
- Extend the dashboard layout to also read the user's tier (it already reads it for author check). Pass `tier` down to the nav.
- Locked nav items (`/chat`, `/writing`, `/speaking`) display the `ProBadge` next to their label.
- Clicking a locked nav item goes to the page as normal, but the page checks tier server-side and renders a `ProGate` wall instead of the real UI — zero client-side API calls made.
- Add a `ProGate` component (`src/components/pro-gate.tsx`): a centered card with lock icon, "This is a Pro feature", short description, and a "Upgrade to Pro — coming soon" CTA (no payment yet, just messaging).
- Free users who reach `/chat`, `/writing`, `/speaking` via direct URL also see the gate.
- `pro` / `pro_max` / `author` tiers bypass the gate entirely and see the full feature.

### Pronunciation fix
- Rewrite `src/lib/speech.ts` to handle the Chrome async voice-loading race condition.
- `speak()` becomes voice-aware: if `getVoices()` returns an empty list, register a one-time `voiceschanged` listener and retry voice selection once voices arrive, then speak.
- On browsers where `voiceschanged` never fires (Firefox loads voices synchronously), the existing synchronous path still works.
- No changes to call sites — the `speak(text, accent)` API is unchanged.

## Capabilities

### New Capabilities
- `pro-nav-badge`: visual "Pro" badge on locked nav items for free-tier users.
- `pro-gate-wall`: server-side locked page for AI features; no client API calls possible.

### Modified Capabilities
- `word-pronunciation`: fix voice loading so the correct accent voice is used reliably across Chrome/Firefox/Safari.

## Impact

- **UI**: new `ProBadge`, `ProGate` components; nav and mobile-nav updated to accept and render tier info.
- **Pages**: `/chat`, `/writing`, `/speaking` pages check tier and conditionally render `ProGate`.
- **Layout**: already fetches tier for author — extend to expose `tier` to nav items.
- **`src/lib/speech.ts`**: async voice loading fix; no API changes.
- **Dependencies**: none new.
- **Risk**: low. Gate is purely additive; pronunciation fix is a behaviour-only improvement with no API surface change.
