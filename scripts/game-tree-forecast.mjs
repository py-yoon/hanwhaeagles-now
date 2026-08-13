// One-off analysis script (not wired into package.json) that builds a win/lose decision
// tree across HANWHA's next N scheduled games, showing how the team's projected
// gaeul-yagu (playoff, rank<=5) probability moves down each branch, plus each opponent's
// 2026-season head-to-head record against HANWHA.
//
// Usage: node scripts/game-tree-forecast.mjs [season] [asOf] [outFile] [dates...]
// dates: explicit YYYY-MM-DD list of the HANWHA games to branch on (default: the three
// requested series-opener dates). Must be chronological and >= asOf.
import fs from 'node:fs/promises';
import { collectSeason } from '../src/collector/kbo.js';
import { calculateStandingsFromGames, KBO_TEAMS } from '../src/collector/standings-reconciliation.js';
import { buildEloTimeline, eloSnapshotAtDate } from '../src/engine/elo.js';
import { buildCurrentStrengthSnapshot } from '../src/engine/current-strength.js';
import { runIntegratedMonteCarlo } from '../src/model/integrated-monte-carlo.js';

const season = Number(process.argv[2] ?? 2026);
const asOf = process.argv[3] ?? new Date().toISOString().slice(0, 10);
const outFile = process.argv[4] ?? `reports/game-tree-${asOf}.json`;
const targetDates = process.argv.slice(5).length ? process.argv.slice(5) : ['2026-08-13', '2026-08-18', '2026-08-20'];
const FOCUS = 'HANWHA';
const ITERATIONS = 30000;
const SEED = 20260813;
// V0.9.4 held-out-validated Elo defaults (see reports/elo-grid-2026-08-12.json).
const K_FACTOR = 10;
const HOME_ADVANTAGE = 25;
const TREE_DEPTH = targetDates.length;

console.log(`[tree] collecting ${season} schedule...`);
const rawGames = await collectSeason({ season, months: [3, 4, 5, 6, 7, 8] });
console.log(`[tree]   ${rawGames.length} games total`);

// The live schedule page occasionally mis-reports today's not-yet-started game as FINAL
// with a 0-0 score (a known KBO page quirk; see git history on normalizeTeamName). Any
// game dated asOf or later can't legitimately be FINAL yet for the purposes of this
// forward-looking tree, so force it back to SCHEDULED rather than trust the scrape.
const games = rawGames.map((g) =>
  g.date >= asOf && g.status === 'FINAL' && !g.home_score && !g.away_score
    ? { ...g, status: 'SCHEDULED', home_score: null, away_score: null }
    : g
);

const focusFuture = games
  .filter((g) => (g.home === FOCUS || g.away === FOCUS) && g.date >= asOf && g.status === 'SCHEDULED')
  .sort((a, b) => a.date.localeCompare(b.date));
const targetGames = targetDates.map((date) => {
  const g = focusFuture.find((x) => x.date === date);
  if (!g) throw new Error(`no scheduled HANWHA game found on ${date}`);
  return g;
});
console.log('[tree] target games:', targetGames.map((g) => `${g.date} ${g.away}@${g.home}`).join(' | '));

// --- Elo snapshot + neutral strength snapshot (no team-stats input: matches the
// DEFAULT_WEIGHTS baseline, offense/bullpen pinned at 0, same as V0.9.4). ---
const timeline = buildEloTimeline(games, { teams: KBO_TEAMS, kFactor: K_FACTOR, homeAdvantage: HOME_ADVANTAGE });
const eloSnap = eloSnapshotAtDate(timeline, asOf);
const strengthSnapshot = buildCurrentStrengthSnapshot({ teams: KBO_TEAMS, elo: eloSnap.ratings, components: {}, metadata: { asOf } });
const snapshots = Object.fromEntries(
  strengthSnapshot.rows.map((r) => [r.team, { ...r.components, elo: (r.elo - 1500) / 400 }])
);
const standingsResult = calculateStandingsFromGames(games, { asOfDate: asOf, teams: KBO_TEAMS });

const basePipelineInput = { standings: standingsResult.standings, games, snapshots, asOf, focusTeam: FOCUS };

function outcomeForFocusWin(game) {
  return game.home === FOCUS ? 'HOME_WIN' : 'AWAY_WIN';
}
function outcomeForFocusLoss(game) {
  return game.home === FOCUS ? 'AWAY_WIN' : 'HOME_WIN';
}
function forceProbabilities(outcome) {
  return { HOME_WIN: outcome === 'HOME_WIN' ? 1 : 0, DRAW: 0, AWAY_WIN: outcome === 'AWAY_WIN' ? 1 : 0 };
}

function runWithForced(decided) {
  const forcedById = new Map(decided.map((d) => [d.game.game_id, d]));
  const games2 = games.map((g) => {
    const d = forcedById.get(g.game_id);
    if (!d) return g;
    return { ...g, probabilities: forceProbabilities(d.win ? outcomeForFocusWin(d.game) : outcomeForFocusLoss(d.game)) };
  });
  const r = runIntegratedMonteCarlo({ ...basePipelineInput, games: games2, iterations: ITERATIONS, seed: SEED });
  return r.playoff_probability;
}

console.log('[tree] running root simulation...');
const root = runIntegratedMonteCarlo({ ...basePipelineInput, iterations: ITERATIONS, seed: SEED });
const gameWinProb = {};
for (const g of targetGames) {
  const f = root.forecasts.find((x) => x.game_id === g.game_id);
  const p = f?.probabilities;
  gameWinProb[g.game_id] = p ? (g.home === FOCUS ? p.HOME_WIN : p.AWAY_WIN) : null;
}

console.log('[tree] building win/lose tree over next', TREE_DEPTH, 'games...');
function buildNode(depth, decided) {
  const playoff_probability = decided.length === 0 ? root.playoff_probability : runWithForced(decided);
  const node = {
    depth,
    path: decided.map((d) => (d.win ? 'W' : 'L')),
    decided: decided.map((d) => ({ game_id: d.game.game_id, date: d.game.date, opponent: d.game.home === FOCUS ? d.game.away : d.game.home, result: d.win ? 'WIN' : 'LOSS' })),
    playoff_probability: Number(playoff_probability.toFixed(6)),
  };
  if (depth < TREE_DEPTH) {
    const game = targetGames[depth];
    node.game = { game_id: game.game_id, date: game.date, opponent: game.home === FOCUS ? game.away : game.home, home_away: game.home === FOCUS ? 'HOME' : 'AWAY', hanwha_win_probability: gameWinProb[game.game_id] != null ? Number(gameWinProb[game.game_id].toFixed(4)) : null };
    node.win = buildNode(depth + 1, [...decided, { game, win: true }]);
    node.lose = buildNode(depth + 1, [...decided, { game, win: false }]);
  }
  return node;
}
const tree = buildNode(0, []);

console.log('[tree] computing 2026-season head-to-head records...');
const opponents = [...new Set(targetGames.map((g) => (g.home === FOCUS ? g.away : g.home)))];
const headToHead = {};
for (const opp of opponents) {
  const played = games.filter((g) => g.status === 'FINAL' && ((g.home === FOCUS && g.away === opp) || (g.away === FOCUS && g.home === opp)));
  let wins = 0, losses = 0, draws = 0;
  for (const g of played) {
    const focusScore = g.home === FOCUS ? g.home_score : g.away_score;
    const oppScore = g.home === FOCUS ? g.away_score : g.home_score;
    if (focusScore > oppScore) wins++; else if (focusScore < oppScore) losses++; else draws++;
  }
  headToHead[opp] = { games: played.length, wins, losses, draws, win_rate: played.length ? Number((wins / played.length).toFixed(4)) : null };
}

const report = {
  season,
  as_of: asOf,
  focus_team: FOCUS,
  root_playoff_probability: Number(root.playoff_probability.toFixed(6)),
  target_games: targetGames.map((g) => ({ game_id: g.game_id, date: g.date, opponent: g.home === FOCUS ? g.away : g.home, home_away: g.home === FOCUS ? 'HOME' : 'AWAY' })),
  head_to_head_2026: headToHead,
  tree,
};

await fs.writeFile(outFile, JSON.stringify(report, null, 2));
console.log(`[tree] wrote -> ${outFile}`);
console.log(JSON.stringify(report, null, 2));
