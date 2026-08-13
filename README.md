# HANWHA NOW v0.7.4

## Integrated 3-way prediction model
Combines pregame-safe Elo, roster strength, starting pitcher, bullpen, offense, defense and recent-form signals into explicit HOME_WIN / DRAW / AWAY_WIN probabilities.

The model is deliberately modular: each component remains separately inspectable, and no current-game result is used before prediction.

### Run
- `npm test`
- `npm run predict -- data/fixtures/prediction-example.json`

Current fixtures remain engineering fixtures; they are not claimed to represent the live 2026 season.

## V0.7.5
Integrated prediction walk-forward backtest. Chronological train/validation split, bounded coordinate weight optimization, deterministic metrics, and leakage-safe pregame feature construction. Current early-April fixture is structural validation only; optimized weights are not promoted to production when validation worsens.


## V0.7.6

Current Team Strength snapshot layer: normalized component weighting, evidence-based confidence, deterministic ranking, and snapshot validation. This layer does not fabricate live data; it accepts only supplied as-of components and records source status.

## V0.9.2 — One-command production pipeline

`bin/hanwha-now.js` wires audit, official-standings reconciliation, live coverage gate, Elo
snapshot, team strength, Monte Carlo, uncertainty, sensitivity, game importance, and report
generation into a single command:

```bash
node bin/hanwha-now.js run --as-of 2026-04-05 --iterations 100000 --allow-fixture --out output/2026-04-05
# or, after `npm link` / installing the bin:
hanwha-now run --as-of 2026-04-05 --iterations 100000
```

Without `--allow-fixture`, the production gate blocks any run whose `--source-status` is not
`live` (the default is `fixture`) — this is intentional fail-closed behavior, not a bug, until
real 2026 KBO data has been collected and reconciled. See `DEVELOPMENT_STATUS.md` for the full
roadmap and `CHANGELOG-v0.9.2.md` for details.
