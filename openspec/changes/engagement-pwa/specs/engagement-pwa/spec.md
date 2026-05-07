## ADDED Requirements

### Requirement: Installable PWA

The system SHALL be installable as a PWA on Chromium-family browsers and iOS Safari (via "Add to Home Screen"). The manifest MUST declare `name`, `short_name`, `start_url=/dashboard`, `display=standalone`, `theme_color`, and at least 192x192 and 512x512 icons.

#### Scenario: Install prompt
- **WHEN** Chrome's `beforeinstallprompt` event fires
- **THEN** the dashboard shows a small "Install app" CTA that triggers the prompt

#### Scenario: iOS share sheet
- **WHEN** the user opens the site on iOS Safari
- **THEN** the dashboard shows a one-line "Tap Share → Add to Home Screen" tip on first visit only

### Requirement: Offline shell

The PWA service worker SHALL cache the dashboard shell and its critical static assets so the app loads (in a degraded state showing "You are offline") when the network is unavailable.

#### Scenario: Offline launch
- **WHEN** the user opens the installed app with no network
- **THEN** the dashboard shell renders with an offline banner; data panels show cached values where possible
