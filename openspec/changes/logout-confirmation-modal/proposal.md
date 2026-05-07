## Why

Currently the logout button triggers an immediate sign-out with no confirmation step. On mobile and during active learning sessions, users frequently tap it by accident and lose their session state. A simple confirmation modal prevents accidental logouts while adding no friction for intentional ones.

## What Changes

- Add a `LogoutConfirmModal` component using shadcn/ui `Dialog` that intercepts the logout action.
- The modal displays "Are you sure you want to log out?" with a **Cancel** button and a **Log out** button.
- Dismissible via the Escape key and by clicking the backdrop (shadcn Dialog default behavior).
- Wire the modal into every existing logout button across the app (dashboard nav, mobile nav, any other surface).
- No new npm dependencies — uses existing shadcn/ui Dialog already in the project.
- **BREAKING**: none. The logout action itself is unchanged; only the confirmation step is added.

## Capabilities

### New Capabilities
- `logout-confirmation`: a reusable `LogoutConfirmModal` component that can be composed into any logout trigger in the app.

### Modified Capabilities
- All existing logout buttons now open the modal instead of firing logout directly.

## Impact

- **UI**: new `src/components/logout-confirm-modal.tsx` client component; modifications to all components that currently call logout directly.
- **Auth flow**: no change to the underlying sign-out logic (`supabase.auth.signOut()`).
- **Dependencies**: none. shadcn/ui `Dialog` is already installed.
- **Risk**: low. Purely additive UI change; worst case a user sees the modal and clicks "Log out" as before.
