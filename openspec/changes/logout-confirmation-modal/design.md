## Context

The app already uses shadcn/ui `Dialog` (confirmed in the project). Sign-out is a server action (`signOutAction` in `src/app/(dashboard)/actions.ts`) called via `<form action={signOutAction}>` in two places:
- `src/app/(dashboard)/layout.tsx` — desktop sidebar logout button (line 115)
- `src/components/nav/mobile-nav.tsx` — mobile nav logout button (line 136), received as a `signOutAction` prop from the layout

Both surfaces pass the server action through a form. The modal replaces this pattern with a client-side gate: clicking "Log out" in the modal submits the form programmatically.

## Goals / Non-Goals

**Goals:**
- Intercept every logout button with a confirmation modal before calling `signOutAction`.
- Modal is accessible: focus trap, Escape key dismissal, backdrop click dismissal (all shadcn Dialog defaults).
- "Cancel" closes the modal and does nothing. "Log out" fires `signOutAction`.
- Single reusable component consumed by all logout surfaces.

**Non-Goals:**
- Session timeout auto-logout (no modal needed there — server-side).
- Customising the sign-out logic itself.
- Toast notifications after logout.

## Decisions

### 1. Client component with `useTransition` for loading state
`LogoutConfirmModal` is a `"use client"` component. It receives `signOutAction` as a prop (the server action function reference). On "Log out" click it calls `startTransition(() => signOutAction())` and shows a loading spinner on the button during the transition.
- **Why**: `useTransition` gives us pending state for free without a manual `useState(loading)`. The server action redirect happens naturally after the transition.
- **Alternative**: submit a hidden form ref — works but is messier and harder to show loading state.

### 2. Trigger via render-prop / slot pattern
`LogoutConfirmModal` accepts a `trigger` prop (a `ReactNode`) rendered as the `DialogTrigger`. This lets each call site pass its own styled button without coupling the modal to a specific button appearance.
- **Why**: Desktop sidebar and mobile nav have visually different logout buttons. Slot pattern keeps both as-is, just wrapped.

### 3. Replace `<form action={signOutAction}>` at both call sites
Both layouts switch from `<form action={signOutAction}><button>Log out</button></form>` to `<LogoutConfirmModal signOutAction={signOutAction} trigger={<button ...>Log out</button>} />`.
- The mobile nav prop (`signOutAction: () => void | Promise<void>`) is updated to accept a server action function directly — no API change, same shape.

### 4. "Log out" button goes red (destructive variant)
Use shadcn `Button variant="destructive"` for the confirm button to signal that the action is irreversible.

## Component API

```tsx
// src/components/logout-confirm-modal.tsx
"use client";

interface LogoutConfirmModalProps {
  signOutAction: () => void | Promise<void>;
  trigger: ReactNode;
}
```

## File Changes

| File | Change |
|---|---|
| `src/components/logout-confirm-modal.tsx` | **New** — modal component |
| `src/app/(dashboard)/layout.tsx` | Replace logout form with `<LogoutConfirmModal>` |
| `src/components/nav/mobile-nav.tsx` | Replace logout form with `<LogoutConfirmModal>` |

## Risks / Trade-offs

- **[Low] Server action ref serialization**: passing a server action as a prop to a client component is supported in Next.js 15 App Router. No issue.
- **[Low] Dialog already installed**: if for any reason shadcn Dialog isn't registered, `npx shadcn@latest add dialog` resolves it. Verify before assuming.
