# V0.9.1

- Added official-standings-to-replay game-count reconciliation gate.
- Production coverage now requires every team to reconcile against an official snapshot.
- Added strict FINAL-score validation at the live coverage boundary.
- Added deterministic `as-of` filtering.
- No synthetic fallback is permitted when live coverage is incomplete.
