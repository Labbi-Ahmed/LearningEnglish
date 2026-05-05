## ADDED Requirements

### Requirement: Email and password sign-up

The system SHALL allow a new user to create an account using an email address and a password via Supabase Auth. The signup form SHALL validate input with Zod before submission.

#### Scenario: Successful signup creates account and profile

- **WHEN** a user submits the signup form with a valid email and password (≥ 8 characters)
- **THEN** the system SHALL create a Supabase auth user, the `handle_new_user` trigger SHALL insert a corresponding `profiles` row, and the user SHALL be redirected to `/dashboard` after email confirmation (or immediately if email confirmation is disabled)

#### Scenario: Invalid email rejected client-side

- **WHEN** a user submits the signup form with a malformed email
- **THEN** the form SHALL display a Zod validation error and SHALL NOT call Supabase

#### Scenario: Duplicate email surfaces a friendly error

- **WHEN** a user submits the signup form with an email that already exists
- **THEN** the system SHALL display a user-facing error message and SHALL NOT leak the underlying Supabase error stack

### Requirement: Email and password sign-in

The system SHALL allow an existing user to sign in with their email and password.

#### Scenario: Successful sign-in

- **WHEN** a user submits the login form with correct credentials
- **THEN** the system SHALL establish a session cookie and redirect the user to `/dashboard`

#### Scenario: Wrong password produces a friendly error

- **WHEN** a user submits the login form with an incorrect password
- **THEN** the system SHALL display a generic "invalid credentials" error and SHALL NOT distinguish between "user not found" and "wrong password" in the UI

### Requirement: Google OAuth sign-in

The system SHALL allow a user to sign in with Google via Supabase OAuth. The OAuth callback SHALL be handled by `/api/auth/callback`.

#### Scenario: Google OAuth completes successfully

- **WHEN** a user clicks the "Continue with Google" button and completes the Google consent flow
- **THEN** the system SHALL receive the OAuth code at `/api/auth/callback`, exchange it for a session, ensure a `profiles` row exists, and redirect to `/dashboard`

#### Scenario: OAuth callback with missing code

- **WHEN** `/api/auth/callback` is called without a `code` query parameter
- **THEN** the system SHALL redirect to `/login` with an error indicator and SHALL NOT throw an unhandled exception

### Requirement: Sign-out

The system SHALL allow an authenticated user to sign out. Sign-out SHALL clear the Supabase session cookie and redirect to `/login`.

#### Scenario: Sign-out from dashboard

- **WHEN** an authenticated user triggers sign-out
- **THEN** the system SHALL call `supabase.auth.signOut()`, clear session cookies, and redirect to `/login`

### Requirement: Session middleware

The system SHALL run middleware on every request that refreshes the Supabase session cookie when needed. The middleware SHALL use the `@supabase/ssr` package.

#### Scenario: Expiring session is refreshed transparently

- **WHEN** an authenticated request arrives with a session cookie nearing expiry
- **THEN** the middleware SHALL refresh the session and update the cookie before the request reaches the route handler

### Requirement: Route guards

The system SHALL redirect unauthenticated requests for any route inside the `(dashboard)` route group to `/login`. The system SHALL redirect authenticated requests for `/login` or `/signup` to `/dashboard`.

#### Scenario: Unauthenticated user is redirected from dashboard

- **WHEN** an unauthenticated user requests any path inside `(dashboard)` (e.g., `/dashboard`, `/vocabulary`)
- **THEN** the middleware SHALL respond with a 307 redirect to `/login`

#### Scenario: Authenticated user is redirected away from auth pages

- **WHEN** a user with a valid session requests `/login` or `/signup`
- **THEN** the middleware SHALL respond with a 307 redirect to `/dashboard`

### Requirement: Three-client Supabase setup

The system SHALL provide three distinct Supabase client factories: a browser client at `src/lib/supabase/client.ts`, a server client at `src/lib/supabase/server.ts`, and a middleware client at `src/lib/supabase/middleware.ts`. Each SHALL be used only in its appropriate context.

#### Scenario: Server Component reads session via server client

- **WHEN** a Server Component inside `(dashboard)` fetches the current user
- **THEN** it SHALL use the server client (which reads cookies via `next/headers`) and SHALL receive the authenticated user

#### Scenario: Browser-only code uses the browser client

- **WHEN** a Client Component needs to call Supabase (e.g., for sign-in)
- **THEN** it SHALL use the browser client and SHALL NOT import the server client

### Requirement: API errors do not leak stack traces

The system SHALL handle authentication errors at the API boundary and SHALL return user-friendly messages. Stack traces and raw Supabase error payloads SHALL NOT be sent to the client.

#### Scenario: Underlying Supabase failure is sanitized

- **WHEN** Supabase Auth returns an internal error during sign-in
- **THEN** the API response SHALL contain a generic user-friendly message and the original error SHALL be logged server-side only
