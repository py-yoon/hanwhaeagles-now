# V0.9.5

Real team-level batting/pitching data collection, wired in as an explicit opt-in signal.

## What was added

- `src/collector/team-stats-parser.js` — a generic parser for KBO's
  `Record/Team/{Hitter,Pitcher}/BasicN.aspx` tables. Every stat cell carries a stable `data-id`
  attribute (e.g. `HRA_RT`, `ERA_RT`, `INN2_CN`) regardless of column order, so rows are parsed
  into a `{data_id: value}` map instead of relying on column position — more robust than the
  positional parsing used elsewhere in the collector. Also handles KBO's fractional-innings
  notation (`"920 2/3"` → `920.667`).
- `src/collector/team-stats.js` — `collectTeamStats()` fetches the team hitter (Basic1 + Basic2)
  and team pitcher (Basic1) pages and merges them into the `{team: {batter, pitcher}}` shape
  `player-features.js`'s `teamFeatureVector()` already expects (avg/ops/hr_rate/bb_rate/so_rate
  for batting; era/whip/k9/bb9/hr9 for pitching).
- `npm run collect:team-stats -- [date] [outFile]` — thin CLI wrapper.
- `bin/hanwha-now.js run --team-stats <file>` — opt-in flag wiring real team batting/pitching
  signal into the offense/bullpen strength components (previously always neutral/0).

## Why this is opt-in, not the new default

Unlike the standings page, the KBO team-stat pages are season-to-date cumulative totals with
**no historical date navigation** — there is no way to ask "what were these stats as of
2026-05-01" short of reconstructing them from ~500 individual box scores (out of scope here).
That means, unlike the Elo K-factor calibration in V0.9.4, this signal **cannot be walk-forward
validated** against the real season without look-ahead leakage (using today's final stats to
"predict" games from months ago would be exactly the kind of future leakage Rule 3 forbids).

It's also worth being explicit that `DEFAULT_WEIGHTS.offense` (0.55) and `.bullpen` (0.35) in
`integrated-prediction.js` have *never* been validated with non-zero offense/bullpen inputs —
V0.9.4's backtest always had those components pinned at 0 (see `integrated-backtest.js`'s
`featuresFromState`), so turning on real values here activates weights whose real-world effect
is genuinely untested, not just "not yet promoted."

So: the collector is real and the numbers are real, but per Rule 5 (validation before
optimization) this ships as an explicit `--team-stats` opt-in, clearly marked
`provenance.team_stats_validated: false` in every report that uses it, rather than silently
becoming the new default production behavior.

## Real data collected (as of 2026-08-12)

```text
HANWHA: AVG .275 / OPS .782  (roughly average-to-slightly-above offense)
        ERA 4.72 / WHIP 1.51 (below-average pitching — worst-ish among contenders)
```

## Effect on the real forecast (illustrative, not a validated improvement)

```text
                        expected_rank   playoff_probability
without --team-stats        6.074            5.27%
with --team-stats           6.075            4.15%
```

Expected rank is essentially unchanged (the current standings gap already dominates), but
playoff probability drops meaningfully once the model sees HANWHA's real below-average team ERA
— directionally plausible, consistent with the team's actual pitching numbers, but not something
this project can currently *prove* improves forecast accuracy. Both are legitimate ways to run
`hanwha-now run`; which one to treat as "the" production number is a product decision, not
something resolved by this change.

## Tests

Added `src/collector/team-stats-parser.test.js` (parser + merge logic, offline/deterministic)
and a `pipeline-run.test.js` case confirming `--team-stats` moves components off neutral and is
tagged unvalidated in provenance. Full suite: 121/121 PASS.

## What would close this gap properly

A per-game box-score scraper that reconstructs team batting/pitching stats *as of* any date in
the season, so this signal could go through the same train/validation split treatment as the Elo
K-factor in V0.9.4. Not attempted here — meaningfully larger scope (order of 500 box scores).
