## ADDED Requirements

### Requirement: Next.js App Router project with TypeScript strict mode

The system SHALL be a Next.js 15 project using the App Router with TypeScript in strict mode. The project SHALL use the `@/` import alias for `src/`. The project SHALL NOT permit `any` without an explicit `// FIXME` comment.

#### Scenario: Fresh clone builds

- **WHEN** a developer runs `npm install && npm run build` on a fresh clone with valid env vars
- **THEN** the build SHALL succeed with zero TypeScript errors and zero ESLint errors

#### Scenario: Strict mode rejects implicit any

- **WHEN** code is added that introduces an implicit `any` without a `// FIXME` comment
- **THEN** `npm run typecheck` SHALL fail

### Requirement: Tailwind + shadcn/ui design system

The system SHALL use Tailwind CSS for styling and shadcn/ui for component primitives. Inline `style={{}}` SHALL NOT be used except for dynamically-computed values. The shadcn primitives needed for auth screens (button, input, label, form, card) SHALL be installed.

#### Scenario: Login page renders shadcn primitives

- **WHEN** a user visits `/login`
- **THEN** the page SHALL render using shadcn `Card`, `Input`, `Label`, and `Button` components styled with Tailwind utility classes

### Requirement: Route group layout

The system SHALL organize routes into `(auth)` and `(dashboard)` route groups. Each group SHALL have its own `layout.tsx` providing layout chrome appropriate to that group.

#### Scenario: Auth pages share an auth layout

- **WHEN** a user visits `/login` or `/signup`
- **THEN** both pages SHALL render inside the `(auth)` group's layout

#### Scenario: Dashboard pages share a dashboard layout

- **WHEN** an authenticated user visits any route inside `(dashboard)`
- **THEN** the page SHALL render inside the `(dashboard)` group's layout

### Requirement: Lint, typecheck, and CI

The system SHALL provide `npm run lint` and `npm run typecheck` scripts. A GitHub Actions workflow at `.github/workflows/ci.yml` SHALL run both on every pull request to `main`.

#### Scenario: PR triggers CI

- **WHEN** a pull request is opened or updated against `main`
- **THEN** GitHub Actions SHALL run `npm run lint` and `npm run typecheck` and SHALL fail the check if either command exits non-zero

### Requirement: Environment configuration

The system SHALL ship a `.env.local.example` file documenting every environment variable the app requires. The actual `.env.local` SHALL be gitignored. The app SHALL fail fast at startup with a clear error message if a required env var is missing.

#### Scenario: Missing env var produces clear error

- **WHEN** the app starts without `NEXT_PUBLIC_SUPABASE_URL` set
- **THEN** the app SHALL log a clear error naming the missing variable and SHALL NOT start serving requests with an undefined Supabase client

### Requirement: PWA manifest stub

The system SHALL include a `public/manifest.json` referenced from the root layout. Full PWA installability is deferred to Phase 8; only the manifest file is required at this phase.

#### Scenario: Manifest is served

- **WHEN** the dev server runs and a request is made for `/manifest.json`
- **THEN** the response SHALL be a valid JSON manifest with at minimum `name`, `short_name`, `start_url`, `display`, and `theme_color`
