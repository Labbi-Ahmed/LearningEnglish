## ADDED Requirements

### Requirement: Roadmap synthesis is read-only

The roadmap UI SHALL be a pure view of the stats endpoint — it MUST NOT have its own state, endpoint, or persistence. Future "advance to next step" logic, if added, must derive from observable user activity.

#### Scenario: Stats refresh
- **WHEN** the user completes activity that changes a step's threshold
- **THEN** revisiting `/roadmap` reflects the new state (TanStack Query invalidates the stats query on relevant mutations)

### Requirement: Step thresholds are documented

The exact thresholds that move a step from locked → in-progress → complete SHALL live in one constants file (`lib/roadmap/thresholds.ts`) and be referenced by both the roadmap UI and the recommendation logic, so they cannot drift.

#### Scenario: Single source of truth
- **WHEN** a threshold is changed
- **THEN** both the roadmap step state and the dashboard recommendation reflect it without code duplication
