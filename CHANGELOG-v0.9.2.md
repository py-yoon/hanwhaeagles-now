# V0.9.2

- Added `bin/hanwha-now.js` — the one-command production pipeline CLI: `hanwha-now run --as-of YYYY-MM-DD --iterations 100000`.
- Added `src/cli/pipeline-run.js`, wiring the previously separate scripts into a single ordered pipeline: audit → checkpoint coverage → official standings reconciliation → live coverage gate → Elo snapshot → current standings → integrated team strength → production gate (Monte Carlo + uncertainty + sensitivity + report) → game importance for the focus team's own upcoming games.
- The pipeline fails closed at the first gate that does not PASS and reports an explicit `{status:'BLOCKED', stage, reason}` instead of a partial or fabricated result.
- Fixed an integration bug found while wiring the pipeline: raw Elo ratings (~1500) were being passed directly into the integrated win-probability model, which expects every strength component on the same small differential scale. This saturated the sigmoid and produced near-0/near-1 single-game probabilities. Elo is now re-centered as `(rating - 1500) / 400` before entering the model, matching the convention already used in `feature-ablation.js`.
- `--out <dir>` writes intermediate artifacts (`audit/`, `reconciliation/`, `snapshots/`, `predictions/`, `reports/hanwha-now-<as-of>.json`), matching the `output/` layout in DEVELOPMENT_STATUS.md.
- Added `data/fixtures/production-run-demo-2026-04.json`, a combined FINAL+SCHEDULED fixture so the full pipeline is runnable end-to-end without live data (fixture-labeled; blocked by the production gate unless `--allow-fixture` is passed).
- Added 7 new tests in `src/cli/pipeline-run.test.js` covering: input validation, the production gate blocking fixture data by default, a full passing run, probability-scale sanity, reconciliation-mismatch fail-closed behavior, audit-failure fail-closed behavior, and deterministic-seed reproducibility. Full suite: 116/116 PASS.

## Known limitations carried into V0.9.3
- No live KBO data has been collected yet; `hanwha-now run` still defaults to fixture data and the production gate correctly blocks it. Real data ingestion (`--source-status live` with real `collect` output) is the next milestone.
- Roster/starter/bullpen/defense/recent-form strength components are not yet computed from real data — only `offense` and `bullpen` are derivable from `--player-stats`, and only when a player-stats file is supplied. They default to neutral (0) rather than being fabricated.
- Game importance is computed only for the focus team's own future games, not the full schedule.
