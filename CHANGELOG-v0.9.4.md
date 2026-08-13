# V0.9.4

Real walk-forward backtest and validation-gated calibration against the real 2026 season
collected in V0.9.3 (510 real FINAL games, chronological 70/30 train/validation split:
357 train games / 153 held-out validation games).

## Experiment 1 — integrated model weights (`integrated-backtest.js`): NOT promoted

Ran `evaluateIntegratedBacktest` (bounded coordinate-descent optimization of the
elo/recent/home weights) against the real season. The optimizer improved training log loss
marginally (1.0736 → 1.0732) but made **held-out validation worse**:

```text
                  validation log_loss   validation accuracy
baseline weights        1.078073              0.5490
optimized weights       1.079625              0.5163   (worse on both)
```

Per the project's own rule ("optimized model promoted only if validation improves"), the
optimized weights are **rejected**. `DEFAULT_WEIGHTS` in `integrated-prediction.js` is
unchanged. This is the validation gate working as designed — it caught overfitting to 357
games and refused to ship it. Full result: `reports/integrated-backtest-2026-08-12.json`.

## Experiment 2 — Elo K-factor / home-advantage grid: promoted for the production CLI only

Ran a proper train/validation grid search (not the full-season in-sample grid `elo-grid.js`
normally does — see caveat below) over `kFactor ∈ {10,20,30,40,50}` ×
`homeAdvantage ∈ {0,25,50,75,100}`, selecting the best config on the 357 training games and
then scoring *that fixed config* on the 153 held-out validation games:

```text
                        validation log_loss   validation brier   validation accuracy
default (K=20, HA=50)         0.8370               0.5434              0.5229
K=10, HA=25                   0.8232               0.5324              0.5098   (log loss/brier better, accuracy slightly worse)
```

Log loss and Brier score are the proper scoring rules for a probabilistic forecaster (unlike
accuracy, which only looks at the arg-max class and ignores calibration), so K=10/HA=25 is
judged the genuine out-of-sample improvement. This **is** promoted, but narrowly: it now ships
as the default `--k-factor 10 --home-advantage 25` for `bin/hanwha-now.js run` only
(`src/cli/pipeline-run.js`). `src/engine/elo.js`'s `DEFAULT_ELO_OPTIONS` (K=20, HA=50) is left
untouched everywhere else in the codebase — it's still correct as the engine-wide baseline used
by `elo-grid.js`, other verifier scripts, and existing tests.

**Caveat**: this is one 70/30 split on one partial season (153 validation games); the win is
real but modest (≈1.6% log loss) and should be re-validated as more of the season accumulates,
per Rule 5 (validation before optimization) — this is a calibration, not a settled conclusion.
Full grid: `reports/elo-grid-2026-08-12.json` (that particular file is still the old
full-season in-sample grid from `elo-grid-run.js`, kept for reference; the train/validation
numbers above came from an ad-hoc split evaluation, not a new permanent script).

## Updated real forecast (as of 2026-08-12, live data, calibrated Elo, all gates PASS)

```text
Record:              48-50-3, rank 6, 12.5 GB
Expected final rank: 6.07  (most likely: 6th)
Playoff probability: 5.27%  (uncertainty band: p10 4.55% – p90 5.06%)
```

Materially unchanged from the V0.9.3 report (0.0525 → 0.0527) — HANWHA's mid-table position is
driven mostly by the current standings gap, not by the marginal Elo recalibration.

## Definition of Done for the First Real Forecast (DEVELOPMENT_STATUS.md §11)

All items now pass:

```text
[x] Full historical coverage acquired (through as-of 2026-08-12)
[x] All FINAL games normalized
[x] No duplicate game IDs
[x] Score validation passed
[x] Team coverage passed
[x] Official standings reconciliation passed (3/3 checkpoints, 0 mismatches)
[x] As-of cutoff passed
[x] Provenance manifest generated (embedded in report.provenance)
[x] Real walk-forward backtest completed
[x] Production model selected through validation (Elo calibration promoted, integrated
    weights correctly rejected)
[x] Remaining schedule collected
[x] Current snapshot generated
[x] Monte Carlo completed
[x] Uncertainty calculated
[x] Important games calculated
[x] Report generated
```

**FIRST REAL HANWHA NOW FORECAST is ready** (`output/2026-08-12/reports/hanwha-now-2026-08-12.json`).

## What's still genuinely missing

- No real player-stat source is wired up, so roster/starter/bullpen/offense/defense stay
  neutral. Elo (now calibrated) is the only real signal in the model.
- Re-running for a new `--as-of` date is still a manual operator action (re-collect + re-run),
  not scheduled.
- The Elo calibration should be periodically re-validated as the season grows past 153
  held-out games.
