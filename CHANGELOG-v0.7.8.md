# V0.7.8 — Pregame Update Engine

## Added
- Confirmed starting-pitcher event ingestion at game level.
- `as-of` cutoff for every starter announcement.
- Future announcement rejection to prevent look-ahead leakage.
- Baseline forecast → confirmed-starter forecast revision flow.
- Idempotent reforecast detection via applied starter event state.
- CLI: `npm run pregame:update -- <game.json> <snapshots.json> <starter-events.json> [asOf]`.

## Policy
- `CONFIRMED`, `ANNOUNCED`, `LOCKED`, `FINAL` starter statuses may update the pregame starter feature.
- `TBD`, `UNKNOWN`, `UNCONFIRMED` never override the baseline.
- Events published/effective after the forecast cutoff are ignored.
- No live/current-game result is used to modify a pregame forecast.

## Verification
- 92/92 tests pass.
- No live data was fabricated or injected into fixtures.
