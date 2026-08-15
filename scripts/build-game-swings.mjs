// Computes, for each of HANWHA's completed games, how much that single game moved the
// season-long playoff (가을야구, rank<=5) probability — isolated from every other same-day
// league game, so the number is attributable to this one result and not to the other 9
// teams' results that day (see docs/index.html's footer disclaimer for why that distinction
// matters).
//
// Method per game g (dated g.date):
//   asOf = day before g.date
//   "before": reconstruct the world as knowable on asOf — every game dated after asOf,
//     including g itself, is forced back to SCHEDULED even though the historical dataset
//     already has it marked FINAL (same trick game-tree-forecast.mjs uses for the live
//     KBO page's FINAL-0-0 quirk, generalized to every future-relative-to-asOf game) —
//     then run the full production Monte Carlo from that snapshot.
//   "after": identical world, except g's own probabilities are forced to its real,
//     already-known outcome (100%/0%) while every other same-day game stays simulated.
//     Same seed as "before" (common random numbers) so the delta isn't just simulation
//     noise from two independent 100k-iteration draws.
//   delta = after - before.
//
// Like game-tree-forecast.mjs, this deliberately uses neutral strength components (no
// team-stats input) rather than the full production pipeline's roster/player-stat-derived
// weights — matching that script's existing precedent, since point-in-time player-stat
// snapshots for arbitrary past dates aren't available. Numbers here can therefore differ
// slightly from the homepage's fully-weighted probability for the same date.
//
// Results are cached by game_id in data/live/game-swings-<season>.json. Past games'
// before/after values never change (both snapshots only look at games dated <= asOf), so a
// rerun only computes games not already in the cache — cheap for the daily case of one new
// game. A full recompute is only needed if the model itself changes (K_FACTOR, weights,
// engine version), tracked via cache.meta.model_version.
import fs from 'node:fs/promises';
import { calculateStandingsFromGames, KBO_TEAMS } from '../src/collector/standings-reconciliation.js';
import { buildEloTimeline, eloSnapshotAtDate } from '../src/engine/elo.js';
import { buildCurrentStrengthSnapshot } from '../src/engine/current-strength.js';
import { runIntegratedMonteCarlo } from '../src/model/integrated-monte-carlo.js';

const SEASON = Number(process.argv[2] ?? 2026);
const FOCUS = 'HANWHA';
// Early-season games force nearly the entire ~675-game schedule back to SCHEDULED (see
// worldAsOf below), so the Monte Carlo simulates almost the whole season per iteration —
// dramatically more expensive than a late-season date with only a few dozen games left.
// 100k iterations (the homepage's headline-number setting) made the season opener alone take
// ~96s; this chip is a secondary metric, not the headline number, so it uses the same reduced
// iteration count the production pipeline already uses for its secondary uncertainty band
// (see src/cli/pipeline-run.js) rather than the full 100k.
const ITERATIONS = 10000;
const SEED = 20260812;
// V0.9.4 held-out-validated Elo defaults (see reports/elo-grid-2026-08-12.json) — same
// constants game-tree-forecast.mjs uses for the same reason.
const K_FACTOR = 10;
const HOME_ADVANTAGE = 25;
const MODEL_VERSION = 'swing-v2-neutral-10k';

const GAMES_PATH = `data/raw/production-${SEASON}.json`;
const CACHE_PATH = `data/live/game-swings-${SEASON}.json`;

function dayBefore(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function worldAsOf(rawGames, asOf) {
  return rawGames.map((g) =>
    g.date > asOf && String(g.status).toUpperCase() === 'FINAL'
      ? { ...g, status: 'SCHEDULED', home_score: null, away_score: null }
      : g
  );
}

function actualOutcome(g) {
  if (g.home_score > g.away_score) return 'HOME_WIN';
  if (g.home_score < g.away_score) return 'AWAY_WIN';
  return 'DRAW';
}

function forceProbabilities(outcome) {
  return { HOME_WIN: outcome === 'HOME_WIN' ? 1 : 0, DRAW: outcome === 'DRAW' ? 1 : 0, AWAY_WIN: outcome === 'AWAY_WIN' ? 1 : 0 };
}

function playoffProbabilityFor(worldGames, asOf) {
  const teams = KBO_TEAMS;
  const timeline = buildEloTimeline(worldGames, { teams, kFactor: K_FACTOR, homeAdvantage: HOME_ADVANTAGE });
  const eloSnap = eloSnapshotAtDate(timeline, asOf);
  const strengthSnapshot = buildCurrentStrengthSnapshot({ teams, elo: eloSnap.ratings, components: {}, metadata: { asOf } });
  const snapshots = Object.fromEntries(strengthSnapshot.rows.map((r) => [r.team, { ...r.components, elo: (r.elo - 1500) / 400 }]));
  const standingsResult = calculateStandingsFromGames(worldGames, { asOfDate: asOf, teams });
  const r = runIntegratedMonteCarlo({ standings: standingsResult.standings, games: worldGames, snapshots, asOf, focusTeam: FOCUS, iterations: ITERATIONS, seed: SEED });
  return r.playoff_probability;
}

async function main() {
  const gamesPayload = JSON.parse(await fs.readFile(GAMES_PATH, 'utf8'));
  const allGames = gamesPayload.games;

  let cache = { meta: { season: SEASON, model_version: MODEL_VERSION, iterations: ITERATIONS, seed: SEED }, games: {} };
  try {
    const existing = JSON.parse(await fs.readFile(CACHE_PATH, 'utf8'));
    if (existing?.meta?.model_version === MODEL_VERSION) cache = existing;
    else console.log('[swings] model_version changed or cache missing — recomputing from scratch');
  } catch {
    console.log('[swings] no existing cache — computing from scratch');
  }

  const hanwhaFinal = allGames
    .filter((g) => (g.home === FOCUS || g.away === FOCUS) && String(g.status).toUpperCase() === 'FINAL')
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.game_id).localeCompare(String(b.game_id)));

  const todo = hanwhaFinal.filter((g) => !cache.games[g.game_id]);
  console.log(`[swings] ${hanwhaFinal.length} completed HANWHA games, ${todo.length} not yet cached`);

  let done = 0;
  for (const g of hanwhaFinal) {
    if (cache.games[g.game_id]) continue;
    const asOf = dayBefore(g.date);
    const worldBefore = worldAsOf(allGames, asOf);
    const before = playoffProbabilityFor(worldBefore, asOf);

    const worldAfter = worldBefore.map((x) =>
      x.game_id === g.game_id ? { ...x, probabilities: forceProbabilities(actualOutcome(g)) } : x
    );
    const after = playoffProbabilityFor(worldAfter, asOf);

    cache.games[g.game_id] = {
      date: g.date,
      as_of: asOf,
      before: Number(before.toFixed(6)),
      after: Number(after.toFixed(6)),
      delta_pct: Number(((after - before) * 100).toFixed(2)),
    };
    done++;
    console.log(`[swings] ${done}/${todo.length} ${g.game_id}: ${(before * 100).toFixed(2)}% -> ${(after * 100).toFixed(2)}% (${cache.games[g.game_id].delta_pct >= 0 ? '+' : ''}${cache.games[g.game_id].delta_pct}p)`);

    if (done % 5 === 0) await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2));
  }

  await fs.mkdir('data/live', { recursive: true });
  await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2));
  console.log(`[swings] wrote -> ${CACHE_PATH} (${Object.keys(cache.games).length} games cached, ${done} newly computed)`);
}

main().catch((err) => {
  console.error('[swings] ERROR', err);
  process.exit(1);
});
