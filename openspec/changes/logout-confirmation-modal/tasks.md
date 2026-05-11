## 1. Verify Dialog component is available

- [x] 1.1 Run `grep -r "from.*@/components/ui/dialog" src --include="*.tsx" -l` — confirm Dialog is already used in the project, or run `npx shadcn@latest add dialog` if absent

## 2. Create LogoutConfirmModal component

- [x] 2.1 Create `src/components/logout-confirm-modal.tsx` as a `"use client"` component with:
  - Props: `signOutAction: () => void | Promise<void>` and `trigger: React.ReactNode`
  - State: `open` boolean via `useState`
  - Use `useTransition` for pending state during sign-out
  - Render shadcn `Dialog` with `DialogTrigger` (the `trigger` prop), `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`
  - Title: "Log out?"
  - Description: "Are you sure you want to log out?"
  - Cancel button: `variant="outline"` — sets `open` to false
  - Log out button: `variant="destructive"` — calls `startTransition(() => signOutAction())`, shows loading text "Logging out…" while pending
  - `DialogContent` gets `onInteractOutside` and `onEscapeKeyDown` handled by shadcn defaults (no extra code needed)

## 3. Update desktop layout logout button

- [x] 3.1 Open `src/app/(dashboard)/layout.tsx`
- [x] 3.2 Add import: `import { LogoutConfirmModal } from "@/components/logout-confirm-modal";`
- [x] 3.3 Replace the `<form action={signOutAction}>…</form>` logout block with:
  ```tsx
  <LogoutConfirmModal
    signOutAction={signOutAction}
    trigger={<button className="...existing classes...">Log out</button>}
  />
  ```
  Preserve all existing button styling exactly.

## 4. Update mobile nav logout button

- [x] 4.1 Open `src/components/nav/mobile-nav.tsx`
- [x] 4.2 Add import: `import { LogoutConfirmModal } from "@/components/logout-confirm-modal";`
- [x] 4.3 Replace the `<form action={signOutAction}>…</form>` logout block with:
  ```tsx
  <LogoutConfirmModal
    signOutAction={signOutAction}
    trigger={<button className="...existing classes...">Log out</button>}
  />
  ```
  Preserve all existing button styling exactly.

## 5. Typecheck and lint

- [x] 5.1 Run `npm run typecheck` — must pass with no errors
- [x] 5.2 Run `npm run lint` — must pass with no warnings or errors

## 6. Smoke test

- [ ] 6.1 Start dev server (`npm run dev`), sign in as any user
- [ ] 6.2 Click logout in desktop sidebar → modal appears with "Log out?" title
- [ ] 6.3 Click "Cancel" → modal closes, user remains logged in
- [ ] 6.4 Press Escape → modal closes, user remains logged in
- [ ] 6.5 Click backdrop → modal closes, user remains logged in
- [ ] 6.6 Click "Log out" → button shows "Logging out…", user is redirected to `/login`
- [ ] 6.7 Repeat 6.2–6.6 on mobile viewport using the mobile nav
