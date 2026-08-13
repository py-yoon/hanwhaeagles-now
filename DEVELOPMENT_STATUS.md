# HANWHA NOW — Development Status & Roadmap

> Current milestone: **V0.9.5 complete — real team batting/pitching data collected and wired in as an opt-in signal**
> Next milestone: **V1.0 — scheduled re-runs, point-in-time player-stat history, service layer**

## Project Goal

HANWHA NOW is a KBO analytics and prediction engine, initially focused on the Hanwha Eagles.

```text
Official KBO Data
  ↓
Collection / Normalization
  ↓
Audit / Reconciliation
  ↓
Elo + Player / Team Strength
  ↓
Pregame Prediction
  ↓
Remaining Schedule
  ↓
Monte Carlo
  ↓
Final Standings Probability
  ↓
HANWHA NOW Report
```

**Core principle:** fixture, demo, synthetic, guessed, or manually injected data must never be presented as real production predictions.

---

# 1. Current Status

Current milestone:

```text
V0.9.5
```

Latest recorded regression result:

```text
121 / 121 PASS
0 FAIL
```

V0.9.5 added a real team-level batting/pitching collector (`npm run collect:team-stats`,
`src/collector/team-stats.js`) and wired it into `hanwha-now run` as an **opt-in**
`--team-stats <file>` flag. It is intentionally not the default: the source has no historical
date navigation (season-to-date cumulative only), so unlike the Elo K-factor in V0.9.4 it cannot
be walk-forward validated without a much larger per-game box-score scraper, and
`DEFAULT_WEIGHTS.offense/.bullpen` have never been exercised with non-zero inputs. Every report
built with `--team-stats` carries `provenance.team_stats_validated: false` so this is never
mistaken for a validated production setting. See `CHANGELOG-v0.9.5.md` for the real numbers this
produced for HANWHA (playoff probability 5.27% → 4.15% once real below-average team ERA is
factored in — directionally plausible, not proven to improve accuracy).

V0.9.4 ran a real walk-forward backtest with a proper chronological train/validation split
(357/153 real games) for both the integrated model's weights and the Elo layer's
K-factor/home-advantage. The integrated weight optimizer overfit (validation got worse) and was
correctly **rejected** — `DEFAULT_WEIGHTS` is unchanged. The Elo grid search found a genuine
held-out improvement (K=10, home-advantage=25 beat the engine default 20/50 on validation log
loss and Brier score) and was **promoted**, but narrowly: only as the CLI's own defaults in
`src/cli/pipeline-run.js` (`--k-factor`/`--home-advantage`), not as a change to
`src/engine/elo.js`'s `DEFAULT_ELO_OPTIONS`, which other callers still rely on unchanged. See
`CHANGELOG-v0.9.4.md` for the full numbers. The Definition of Done checklist in §11 below is now
fully satisfied.

The one-command pipeline from V0.9.2 has now been run against **real** 2026 KBO data collected
live from `koreabaseball.com`, not fixtures:

```bash
node bin/hanwha-now.js run --as-of 2026-08-12 \
  --games data/raw/production-2026.json \
  --official data/raw/official-2026-04-30.json --official data/raw/official-2026-06-30.json --official data/raw/official-2026-08-12.json \
  --source-status live --iterations 100000 --out output/2026-08-12
```

All gates PASS (audit, checkpoint coverage, official-standings reconciliation across three
checkpoints with zero mismatches, live coverage, strength-snapshot health) and
`node src/verifier/production-gate-run.js output/2026-08-12/reports/hanwha-now-2026-08-12.json`
reports `PRODUCTION_GATE=PASS`. See `CHANGELOG-v0.9.3.md` for the two real bugs found and fixed
while doing this (a silent date-navigation bug in the standings collector, and a provenance bug
that mislabeled every live report as `fixture`) and for the current real forecast numbers.

The main remaining blocker has shifted from "no real data" to:

```text
The integrated model has not been walk-forward backtested or calibrated against real data.
```

`hanwha-now run` without `--source-status live` (or with fixture data) still correctly BLOCKS at
the production gate — this is expected, not a bug. Re-collecting the raw schedule and official
standings for a new `--as-of` date is a manual, on-demand operation right now (see
`npm run collect:checkpoints` and `npm run collect:standings`); there is no scheduled ingestion yet.

---

# 2. Completed Architecture

## 2.1 Data Collection

Implemented concepts:

- KBO schedule collection
- monthly checkpoints
- game normalization
- `game_id` duplicate detection
- cross-month duplicate detection
- invalid date/team/home-away validation
- FINAL score integrity validation
- `as_of` cutoff
- retry/timeout structure
- fail-closed behavior

Game states:

```text
FINAL
LIVE
SCHEDULED
POSTPONED
RESCHEDULED
CANCELLED
```

Rules:

```text
FINAL      → historical replay
LIVE       → not treated as finalized history
SCHEDULED  → future forecast
POSTPONED  → future schedule handling
RESCHEDULED→ future schedule handling
CANCELLED  → excluded
```

## 2.2 Reconciliation

Implemented:

```text
Schedule / Scoreboard
        ↓
Normalization
        ↓
Audit
        ↓
Replay W/L/D
        ↓
Official Daily Standings
        ↓
Reconciliation
```

Checks include:

- wins/losses/draws
- games played
- winning percentage
- rank
- games behind
- missing games
- duplicate games
- score conflicts
- status conflicts

Failure means:

```text
production prediction = BLOCKED
```

## 2.3 Elo Layer

Implemented:

- chronological replay
- walk-forward updates
- K-factor exploration
- home advantage
- accuracy
- log loss
- Brier score
- calibration structures
- Elo timeline
- team snapshot
- Elo rank
- official-rank vs Elo-rank spread
- recent Elo trend

Pregame rule:

```text
Pregame snapshot
→ prediction
→ actual result
→ Elo update
```

No future result may enter pregame features.

## 2.4 Player / Team Features

Feature structures include:

### Offense

```text
AVG / OBP / SLG / OPS
HR% / BB% / SO%
```

### Pitching

```text
ERA / WHIP / K9 / BB9 / HR9 / K%
```

Team components are separated:

```text
Starter
Bullpen
Offense
Defense
Recent Form
Roster Strength
Elo
```

Implemented principles:

- season vs recent performance
- small-sample shrinkage
- as-of snapshots
- pregame-only features
- home/away differences

## 2.5 Active Roster Engine

Implemented:

```text
Player
├── active_from
├── active_to
├── team
├── role
└── availability
```

Supports:

- registration
- deregistration
- team movement
- active roster lookup
- roster-based team strength

Rule:

```text
If player is not active at game time:
    contribution = 0
```

## 2.6 Integrated Team Strength

```text
Team Strength
├── Starter
├── Bullpen
├── Offense
├── Defense
├── Recent Form
├── Roster Strength
└── Elo
```

Feature contributions can be retained for debugging and explanation.

## 2.7 Integrated Prediction Model

```text
Elo
+ Roster Strength
+ Starting Pitcher
+ Bullpen
+ Offense
+ Defense
+ Recent Form
+ Home Advantage
        ↓
HOME WIN / DRAW / AWAY WIN
```

Implemented:

- feature scores
- configurable weights
- 3-way probability normalization
- feature contribution trace
- log loss
- Brier score
- walk-forward evaluation
- baseline vs optimized comparison
- validation gate before weight promotion

Rule:

```text
Optimized model
    ↓
Validation improves?
    ├── YES → eligible for promotion
    └── NO  → keep baseline
```

## 2.8 Pregame Update Engine

```text
Scheduled Prediction
      ↓
Starter Confirmation
      ↓
Roster Change
      ↓
Immutable Pregame Snapshot
      ↓
Revised Forecast
```

Safeguards:

- TBD / UNKNOWN / UNCONFIRMED ignored
- duplicate events ignored
- future announcement leakage blocked
- post-start information blocked

## 2.9 Remaining Schedule Forecast

```text
FINAL      → historical replay
SCHEDULED  → forecast
POSTPONED  → forecast handling
RESCHEDULED→ forecast handling
LIVE       → excluded
CANCELLED  → excluded
```

Each future game can expose:

- home/draw/away probabilities
- feature trace
- prediction timestamp
- provenance

## 2.10 Monte Carlo

Implemented concept:

```text
Current Standings
+ Current Team Strength
+ Remaining Schedule
+ Game Probabilities
        ↓
100,000 simulations
        ↓
Final Standings Distribution
```

Potential outputs:

```text
1st–10th rank probabilities
Playoff probability
Championship probability
Expected final rank
```

Also:

- deterministic seeds
- memory-conscious simulation

## 2.11 Game Importance

For each game:

```text
Force WIN
Force DRAW
Force LOSS
```

Compare downstream playoff/final-rank outcomes.

Output concept:

```text
Win  → PS probability
Draw → PS probability
Loss → PS probability

Impact Range
```

## 2.12 Uncertainty

Implemented ensemble structure:

```text
Model Weight Perturbation
        ↓
Simulation Ensemble
        ↓
P10 / P50 / P90
```

## 2.13 Sensitivity

Shock components independently:

```text
Starter
Bullpen
Offense
Roster
Recent Form
```

Measure impact on:

- playoff probability
- expected rank

## 2.14 Report Schema

Conceptual report:

```json
{
  "current_rank": null,
  "current_record": null,
  "team_strength": {},
  "prediction": {
    "expected_rank": null,
    "playoff_probability": null,
    "championship_probability": null,
    "rank_distribution": {}
  },
  "uncertainty": {},
  "sensitivity": {},
  "important_games": [],
  "provenance": {}
}
```

---

# 3. Production Safety Gates

```text
Fixture Data?
    YES → BLOCK

Incomplete Season Coverage?
    YES → BLOCK

Missing Team Coverage?
    YES → BLOCK

Reconciliation Failure?
    YES → BLOCK

Invalid FINAL Score?
    YES → BLOCK

Future Leakage?
    YES → BLOCK
```

Only:

```text
Verified Data
+ Coverage PASS
+ Audit PASS
+ Reconciliation PASS
+ Provenance PASS
+ Leakage PASS
        ↓
PRODUCTION PREDICTION ALLOWED
```

---

# 4. Main Remaining Problem

The architecture is currently ahead of the verified data.

Priority is:

```text
REAL DATA FIRST
```

Required production inputs:

```text
Season FINAL games
+ Current standings
+ Player statistics
+ Roster timeline
+ Remaining schedule
+ Pregame updates
```

---

# 5. Next Milestone — V0.9.4

## Real walk-forward backtest & model calibration

V0.9.2 (this CLI, implemented) and V0.9.3 (real data ingestion, done for the current as-of date)
are complete — see CHANGELOG-v0.9.2.md / CHANGELOG-v0.9.3.md. The one-command interface already
exists and has been run against real data:

```bash
hanwha-now run --as-of YYYY-MM-DD --iterations 100000 --source-status live \
  --games <real games file> --official <real snapshot 1> --official <real snapshot 2> ...
```

Pipeline:

```text
Collect
→ Normalize
→ Audit
→ Official Standings Reconciliation
→ Coverage Check
→ Source / Provenance Validation
→ Elo Snapshot
→ Roster Snapshot
→ Integrated Team Strength
→ Remaining Schedule Forecast
→ Monte Carlo
→ Uncertainty
→ Sensitivity
→ Game Importance
→ HANWHA NOW Report
```

Suggested output:

```text
output/
├── raw/
├── normalized/
├── audit/
├── reconciliation/
├── snapshots/
├── predictions/
└── reports/
    └── hanwha-now-YYYY-MM-DD.json
```

---

# 6. Roadmap

## V0.9.2 — One-command pipeline

Goal:

```bash
hanwha-now run --as-of YYYY-MM-DD
```

Requirements:

- reproducible run
- explicit provenance
- fail-closed behavior

## V0.9.3 — Historical data completion

Acquire and verify:

```text
2026 season start
        ↓
current as-of date
```

Requirements:

- all FINAL games
- full team coverage
- official standings reconciliation
- no duplicates
- no score conflicts

## V0.9.4 — Real walk-forward backtest

Compare:

```text
Elo only
Elo + recent form
Elo + roster
Elo + starter
Full model
```

Metrics:

```text
Accuracy
Log Loss
Brier Score
Calibration
ECE
MCE
```

Promote complexity only when out-of-sample validation improves.

## V0.9.5 — First production prediction

Target:

```bash
hanwha-now predict --as-of YYYY-MM-DD
```

Generate:

- current position
- team strength
- remaining games
- rank distribution
- playoff probability
- championship probability
- important games
- uncertainty range

## V1.0.0 — Service layer

Potential sections:

```text
1. NOW
2. FORECAST
3. PLAYOFF
4. IMPORTANT GAMES
5. TEAM STRENGTH
6. WHY?
7. DATA STATUS
```

---

# 7. Recommended CLI Workflow

Inspect the repository first and use the actual package scripts/entrypoints if they already exist.

Recommended final interface:

```bash
# Tests
npm test
# or
pytest

# Validation
hanwha-now validate

# Collection
hanwha-now collect --season 2026

# Reconciliation
hanwha-now reconcile --season 2026

# Snapshot
hanwha-now snapshot --as-of YYYY-MM-DD

# Forecast
hanwha-now forecast --as-of YYYY-MM-DD

# Simulation
hanwha-now simulate --as-of YYYY-MM-DD --iterations 100000

# Full production run
hanwha-now run --as-of YYYY-MM-DD --iterations 100000
```

---

# 8. Recommended Immediate Workflow

```text
STEP 1
Inspect repository structure.

STEP 2
Run the complete regression suite.

STEP 3
Locate the existing CLI entrypoint.

STEP 4
Implement/verify:
    hanwha-now run --as-of YYYY-MM-DD

STEP 5
Connect real KBO collection.

STEP 6
Run:
    collect
    audit
    reconcile

STEP 7
Do NOT bypass failed production gates.

STEP 8
If all gates pass:
    build snapshot
    forecast remaining games
    simulate
    generate report

STEP 9
If a gate fails:
    stop production prediction
    output explicit failure reason.
```

---

# 9. Non-Negotiable Rules

## Rule 1 — No fake production data

Never use:

- demo fixtures
- synthetic games
- guessed standings
- manually injected records

as production inputs.

## Rule 2 — FINAL only for historical replay

```text
FINAL → historical model
LIVE → wait
SCHEDULED → future
CANCELLED → ignore
```

## Rule 3 — No future leakage

Every feature must satisfy:

```text
feature_timestamp <= game_start_time
```

No future player statistics, roster events, starter announcements, standings, or game results in historical pregame features.

## Rule 4 — Fail closed

If data quality is uncertain:

```text
DO NOT PREDICT
```

Use explicit statuses such as:

```text
INCOMPLETE
FAILED_VALIDATION
SOURCE_ERROR
RECONCILIATION_ERROR
```

## Rule 5 — Validation before optimization

Do not promote a more complex model without out-of-sample improvement.

---

# 10. Current Priority Order

```text
1. Real 2026 KBO data ingestion
2. Full season reconciliation
3. One-command production pipeline
4. Real walk-forward backtest
5. Real prediction
6. Production report
7. API / UI
```

Avoid adding speculative model complexity until items 1–4 are reliable.

---

# 11. Definition of Done for the First Real Forecast

```text
[ ] Full historical coverage acquired
[ ] All FINAL games normalized
[ ] No duplicate game IDs
[ ] Score validation passed
[ ] Team coverage passed
[ ] Official standings reconciliation passed
[ ] As-of cutoff passed
[ ] Provenance manifest generated
[ ] Real walk-forward backtest completed
[ ] Production model selected through validation
[ ] Remaining schedule collected
[ ] Current snapshot generated
[ ] Monte Carlo completed
[ ] Uncertainty calculated
[ ] Important games calculated
[ ] Report generated
```

When all items pass:

```text
FIRST REAL HANWHA NOW FORECAST
```

is ready.

---

# 12. Handoff Prompt for CLI Development

```text
You are continuing development of the HANWHA NOW repository.

Read DEVELOPMENT_STATUS.md first.

Current milestone:
V0.9.3 complete (one-command pipeline exists and has produced a real, production-gate-passing
forecast from live-collected data; see CHANGELOG-v0.9.2.md and CHANGELOG-v0.9.3.md).

Primary next objective:
V0.9.4 — real walk-forward backtest of the full integrated model (not just Elo) against the
real collected season, and calibration/promotion of weights only if out-of-sample validation
improves over the current DEFAULT_WEIGHTS baseline.

Target command (already implemented, keep working):

hanwha-now run --as-of YYYY-MM-DD --iterations 100000 --source-status live

Required pipeline:

collect
→ normalize
→ audit
→ official standings reconciliation
→ coverage gate
→ source/provenance validation
→ Elo snapshot
→ roster snapshot
→ integrated team strength
→ remaining schedule forecast
→ Monte Carlo
→ uncertainty
→ sensitivity
→ game importance
→ HANWHA NOW report

Non-negotiable rules:

1. Never use fixture/demo/generated data as production data.
2. Historical replay uses FINAL games only.
3. Future forecasting excludes FINAL/LIVE/CANCELLED games.
4. Every historical feature obeys pregame/as-of cutoff.
5. Reconciliation, coverage, provenance, or source validation failure must fail closed.
6. Never bypass production gates.
7. Run the complete regression suite after changes.
8. Preserve backward compatibility unless a migration is justified.
9. Prefer real data ingestion and reconciliation over new speculative features.

Current main blocker:
verified full 2026 KBO season ingestion and reconciliation.

Work autonomously until a destructive/irreversible action or a genuine product decision requires human input.

After each milestone:
- update DEVELOPMENT_STATUS.md
- document commands
- document test results
- document known limitations
- never claim real predictions unless production gates pass.
```

---

# Final Direction

The correct next sequence is:

```text
STOP adding speculative model complexity
            ↓
CONNECT REAL DATA
            ↓
VERIFY REAL DATA
            ↓
BACKTEST
            ↓
CALIBRATE
            ↓
PREDICT
            ↓
SHIP
```

The next major success criterion is not another version number.

> **A fully reproducible real-data run that produces the first trustworthy HANWHA NOW forecast.**
