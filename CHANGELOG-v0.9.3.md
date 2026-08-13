# V0.9.3

First real 2026 KBO data ingestion and the first production-gate-passing HANWHA NOW forecast.

- Collected the real 2026 regular season schedule (March–August) directly from
  `koreabaseball.com/Schedule/Schedule.aspx`: 645 games (510 FINAL, 51 CANCELLED, 84 SCHEDULED).
  Season audit and checkpoint coverage both PASS with zero errors on the live data —
  no duplicate game IDs, no invalid scores, no unknown teams.
- **Fixed a silent data-correctness bug in `src/collector/daily-standings.js`.** The collector
  requested historical standings via a `?gameDate=` query string, but the real KBO standings
  page ignores that parameter entirely and always renders today's data — so every "historical"
  snapshot was silently mislabeled with the wrong date's data. The page actually drives date
  navigation through a hidden `hfSearchDate` field plus a `display:none` `btnCalendarSelect`
  postback button (the same mechanism its own calendar widget uses); the collector now
  replicates that, and verifies the page actually landed on the requested date before returning
  rows instead of trusting the request silently succeeded.
- Collected and reconciled three real official-standings checkpoints (2026-04-30, 2026-06-30,
  2026-08-12) against the replayed game log. All three reconcile with **zero mismatches** —
  win/loss/draw/rank/games-behind computed from the replayed game-by-game results exactly match
  KBO's official standings at each point in the season.
- **Fixed a second bug found while generating the first real report**: `report.provenance.source_status`
  always read `'fixture'` regardless of the actual source, because `runIntegratedMonteCarlo`'s
  return value never carried `source_status` through from the (already-validated) pipeline input.
  This meant `production-gate-run.js` — which exists specifically to block non-live reports —
  would have rejected every genuinely live report. Fixed in `src/model/pipeline.js` by stamping
  the validated `source_status` onto the simulation result before it reaches the report builder.
  Added a regression test in `src/model/pipeline.test.js`.
- Ran `hanwha-now run --as-of 2026-08-12 --source-status live` end to end on the real data.
  Every gate passed (audit, coverage, reconciliation, live coverage, strength-snapshot health,
  production gate), and `node src/verifier/production-gate-run.js <report>` reports
  `PRODUCTION_GATE=PASS`. This is the first report in the project's history that is both
  mechanically real (live-sourced, gate-passed) and not a fixture demo.
- Ran a real walk-forward Elo backtest (`walkForwardBacktest`) over the 510 real FINAL games:
  accuracy 53.1%, log loss 0.810, Brier score 0.529, with default (untuned) K=20 / home-advantage=50.
  This is the Elo-only baseline; no K-factor grid search or full integrated-model backtest against
  real data has been run yet.
- Added `src/collector/daily-standings-run.js` (`npm run collect:standings -- <date> [outFile]`)
  as a thin, reusable CLI wrapper matching the project's existing run-script convention.

## Current real HANWHA NOW forecast (as of 2026-08-12, live data, all gates PASS)

```text
Record:              48-50-3, rank 6, 12.5 GB
Expected final rank: 6.07  (most likely: 6th)
Playoff probability: 5.25%  (uncertainty band: p10 4.67% – p90 5.15%)
```

Full report: `output/2026-08-12/reports/hanwha-now-2026-08-12.json`.

## Honest limitations of this forecast

- **The integrated model has not been walk-forward backtested against real data yet.**
  `DEFAULT_WEIGHTS` in `integrated-prediction.js` are still the original hand-set values; they
  have never been validated for accuracy against this real 645-game season. Only the Elo-only
  sub-model has a real backtest number (above). Per Rule 5 (validation before optimization),
  this forecast should be read as "the pipeline works end-to-end on real data," not yet as "the
  model is calibrated and trustworthy" — that is V0.9.4.
- Team strength components (roster / starter / bullpen / offense / defense / recent form) are
  still neutral (0) in this run because no real player-stat source has been wired up yet — only
  Elo carries real signal. `--player-stats` exists as a CLI option but nothing collects live KBO
  player stats yet.
- Standings snapshots are collected on demand for specific dates chosen by the operator; there
  is no scheduled/automated daily collection yet.
