import fs from 'node:fs/promises';
import path from 'node:path';

import { auditSeasonGames } from '../collector/season-audit.js';
import { auditCheckpointCoverage } from '../collector/coverage-checkpoints.js';
import { reconcileOfficialTimeline, calculateStandingsFromGames, KBO_TEAMS } from '../collector/standings-reconciliation.js';
import { validateLiveCoverage } from '../verifier/live-coverage-gate.js';
import { buildEloTimeline, eloSnapshotAtDate } from '../engine/elo.js';
import { buildCurrentStrengthSnapshot, validateStrengthSnapshot } from '../engine/current-strength.js';
import { aggregateTeamPlayerStats, teamFeatureVector } from '../model/player-features.js';
import { runIntegratedMonteCarlo } from '../model/integrated-monte-carlo.js';
import { runProductionPipeline } from '../model/pipeline.js';
import { estimateGameImportance } from '../model/game-importance.js';

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

function blocked(stage, reason, extra = {}) {
  return { status: 'BLOCKED', stage, reason, ...extra };
}

/** Derive per-team strength components from player stats. Only fields with a real
 * statistical basis are populated; everything else stays 0 (neutral) so the model
 * never fabricates signal it has no evidence for. */
function buildComponentsFromPlayerStats(playerStatRows, teams, asOf) {
  if (!playerStatRows) return {};
  const stats = aggregateTeamPlayerStats(playerStatRows, { asOf });
  const components = {};
  for (const team of teams) {
    const teamStats = stats[team];
    if (!teamStats) continue;
    const vector = teamFeatureVector(teamStats);
    components[team] = {
      offense: vector.batting_ops,
      bullpen: vector.pitching_era,
      sample: { games: 0, players: teamStats.players, starterSamples: 0, bullpenIP: teamStats.pitcher?.ip ?? 0 }
    };
  }
  return components;
}

/** Same idea as buildComponentsFromPlayerStats, but from src/collector/team-stats.js's
 * already-team-level {team:{batter,pitcher}} scrape (season-to-date cumulative, current-day
 * only — no point-in-time history exists for this source). NOTE: this signal has not been
 * walk-forward validated the way the Elo layer was in V0.9.4 — there is no historical
 * point-in-time team-stat data to backtest against without scraping individual box scores, so
 * DEFAULT_WEIGHTS.offense/bullpen have never actually been exercised with non-zero inputs.
 * Opt-in only (--team-stats); left out of the default run for that reason. */
function buildComponentsFromTeamStats(teamStats, teams) {
  if (!teamStats) return {};
  const components = {};
  for (const team of teams) {
    const stats = teamStats[team];
    if (!stats) continue;
    const vector = teamFeatureVector(stats);
    components[team] = {
      offense: vector.batting_ops,
      bullpen: vector.pitching_era,
      sample: { games: 0, players: 0, starterSamples: 0, bullpenIP: stats.pitcher?.ip ?? 0 }
    };
  }
  return components;
}

/**
 * Runs the full V0.9.2 one-command production pipeline:
 * collect(pre-loaded) -> audit -> official reconciliation -> coverage gates
 * -> Elo snapshot -> team strength -> Monte Carlo -> uncertainty -> sensitivity
 * -> game importance -> HANWHA NOW report.
 *
 * Fails closed at the first gate that does not PASS; never promotes fixture
 * data to a production report unless allowFixture is explicitly set.
 */
export async function runProductionCliPipeline(options = {}) {
  const {
    asOf,
    gamesFile = 'data/fixtures/production-run-demo-2026-04.json',
    officialFiles = ['data/fixtures/official-2026-04-05.json'],
    playerStatsFile = null,
    teamStatsFile = null,
    focusTeam = 'HANWHA',
    iterations = 100000,
    seed = 20260812,
    sourceStatus = 'fixture',
    allowFixture = false,
    outDir = null,
    write = false,
    // Validated via V0.9.4 held-out backtest (train games[0:357] / validation games[357:510]
    // of the real 2026 season): kFactor=10, homeAdvantage=25 beat the engine-wide default
    // (20/50) on held-out log loss (0.8232 vs 0.8370) and Brier score. See
    // reports/elo-grid-2026-08-12.json and CHANGELOG-v0.9.4.md. This only overrides the Elo
    // layer for this production CLI; src/engine/elo.js's DEFAULT_ELO_OPTIONS is left alone
    // since other callers (baselines, comparisons, existing tests) rely on it unchanged.
    kFactor = 10,
    homeAdvantage = 25,
  } = options;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf ?? '')) {
    return blocked('INPUT_VALIDATION', `--as-of must be YYYY-MM-DD, received: ${asOf}`);
  }

  const gamesPayload = await readJson(gamesFile);
  const games = gamesPayload.games ?? [];
  const teams = (gamesPayload.initial_standings ?? []).map((x) => x.team);
  const teamList = teams.length ? teams : [...KBO_TEAMS];

  const officialSnapshots = await Promise.all(officialFiles.map(readJson));
  const latestOfficial = officialSnapshots.slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).at(-1);

  const artifacts = { as_of: asOf, games_file: gamesFile, official_files: officialFiles };

  // --- Audit ---
  const audit = auditSeasonGames(games, { teams: teamList });
  artifacts.audit = audit;
  if (write && outDir) await writeJson(path.join(outDir, 'audit', 'audit.json'), audit);
  if (audit.status !== 'PASS') return blocked('AUDIT', 'Season audit failed', { audit });

  // --- Checkpoint coverage (duplicate / cross-checkpoint detection) ---
  const coverage = auditCheckpointCoverage(games);
  artifacts.coverage = coverage;
  if (write && outDir) await writeJson(path.join(outDir, 'audit', 'coverage.json'), coverage);
  if (coverage.status !== 'PASS') return blocked('COVERAGE', 'Checkpoint coverage failed', { coverage });

  // --- Official standings reconciliation ---
  const reconciliation = reconcileOfficialTimeline({ games, snapshots: officialSnapshots, teams: teamList });
  artifacts.reconciliation = reconciliation;
  if (write && outDir) await writeJson(path.join(outDir, 'reconciliation', 'reconciliation.json'), reconciliation);
  if (reconciliation.status !== 'PASS') return blocked('RECONCILIATION', 'Official standings reconciliation failed', { reconciliation });

  // --- Live coverage gate (as-of cutoff, duplicate FINALs, score integrity) ---
  const liveCoverage = validateLiveCoverage({ games, standings: latestOfficial?.official_standings ?? [], asOfDate: asOf });
  artifacts.live_coverage = liveCoverage;
  if (write && outDir) await writeJson(path.join(outDir, 'reconciliation', 'live-coverage.json'), liveCoverage);
  if (liveCoverage.status !== 'PASS') return blocked('LIVE_COVERAGE', 'Live coverage gate failed', { liveCoverage });

  // --- Elo snapshot (pregame-safe: only games up to and including as-of) ---
  const timeline = buildEloTimeline(games, { teams: teamList, kFactor, homeAdvantage });
  const eloSnap = eloSnapshotAtDate(timeline, asOf);
  artifacts.elo_snapshot = eloSnap;
  if (write && outDir) await writeJson(path.join(outDir, 'snapshots', 'elo-snapshot.json'), eloSnap);

  // --- Current standings as-of (source of truth for Monte Carlo starting point) ---
  const standingsResult = calculateStandingsFromGames(games, { asOfDate: asOf, teams: teamList });
  artifacts.standings = standingsResult;

  // --- Roster / player-derived components (optional; neutral if unavailable) ---
  let playerStatRows = null;
  if (playerStatsFile) playerStatRows = await readJson(playerStatsFile);
  const components = buildComponentsFromPlayerStats(playerStatRows, teamList, asOf);

  // --- Team-level batting/pitching components (optional, opt-in, unvalidated — see the
  // function doc comment). Takes precedence over the per-player path above when both are given.
  if (teamStatsFile) {
    const teamStatsPayload = await readJson(teamStatsFile);
    const teamComponents = buildComponentsFromTeamStats(teamStatsPayload.teams ?? teamStatsPayload, teamList);
    Object.assign(components, teamComponents);
  }

  // --- Integrated team strength snapshot ---
  const strengthSnapshot = buildCurrentStrengthSnapshot({
    teams: teamList,
    elo: eloSnap.ratings,
    components,
    metadata: { asOf, sourceStatus },
  });
  const strengthHealth = validateStrengthSnapshot(strengthSnapshot, teamList.length);
  artifacts.strength_snapshot = strengthSnapshot;
  artifacts.strength_health = strengthHealth;
  if (write && outDir) await writeJson(path.join(outDir, 'snapshots', 'strength-snapshot.json'), strengthSnapshot);

  // The strength snapshot keeps raw Elo ratings (~1500) for display/ranking; the
  // win-probability model (integrated-prediction.js) expects every component on the
  // same small differential scale, so Elo is re-centered the same way feature-ablation.js
  // does: (rating - 1500) / 400. Feeding the raw rating here would saturate the sigmoid.
  const snapshotsForForecast = Object.fromEntries(
    strengthSnapshot.rows.map((r) => [r.team, { ...r.components, elo: (r.elo - 1500) / 400 }])
  );

  const pipelineInput = {
    sourceStatus,
    standings: standingsResult.standings,
    games,
    snapshots: snapshotsForForecast,
    asOf,
    focusTeam,
  };

  // --- Monte Carlo + uncertainty + sensitivity + report (production gate enforced here) ---
  let productionResult;
  try {
    productionResult = runProductionPipeline(pipelineInput, { iterations, seed, allowFixture });
  } catch (err) {
    return blocked('PRODUCTION_GATE', err.message, { source_status: sourceStatus });
  }

  const report = productionResult.report;

  // --- Game importance for the focus team's own upcoming games ---
  const simForImportance = runIntegratedMonteCarlo({ ...pipelineInput, iterations: Math.min(iterations, 20000), seed });
  const focusFutureGameIds = simForImportance.forecasts
    .filter((f) => f.home === focusTeam || f.away === focusTeam)
    .map((f) => f.game_id);
  const importantGames = focusFutureGameIds.map((gameId) =>
    estimateGameImportance({
      base: { ...pipelineInput, forecasts: simForImportance.forecasts, playoff_probability: simForImportance.playoff_probability },
      gameId,
      iterations: Math.min(iterations, 5000),
      seed,
    })
  ).sort((a, b) => b.impact_range - a.impact_range);

  report.important_games = importantGames;
  report.provenance = {
    ...report.provenance,
    simulation_seed: seed,
    games_source: gamesFile,
    official_sources: officialFiles,
    team_stats_source: teamStatsFile,
    team_stats_validated: false,
    audit_status: audit.status,
    coverage_status: coverage.status,
    reconciliation_status: reconciliation.status,
    live_coverage_status: liveCoverage.status,
    strength_health_status: strengthHealth.status,
  };

  artifacts.simulation = { forecasts: simForImportance.forecasts, playoff_probability: simForImportance.playoff_probability };
  artifacts.report = report;

  if (write && outDir) {
    await writeJson(path.join(outDir, 'predictions', 'simulation.json'), artifacts.simulation);
    await writeJson(path.join(outDir, 'reports', `hanwha-now-${asOf}.json`), report);
  }

  return { status: 'PASS', report, artifacts };
}
