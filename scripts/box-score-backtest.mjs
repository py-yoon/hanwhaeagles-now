// One-off analysis script (not wired into package.json) that answers V0.9.5's open question:
// does turning on real per-game offense/bullpen (via box scores) actually improve the
// integrated model's held-out validation loss, using the exact same chronological
// train/validation split methodology as the V0.9.4 Elo K-factor calibration?
//
// Usage: node scripts/box-score-backtest.mjs [season] [outFile]
import fs from 'node:fs/promises';
import { collectSeason } from '../src/collector/kbo.js';
import { fetchBoxScores } from '../src/collector/box-score.js';
import { evaluateIntegratedBacktest } from '../src/model/integrated-backtest.js';

const season = Number(process.argv[2] ?? 2026);
const outFile = process.argv[3] ?? `data/raw/box-scores-${season}.json`;

console.log(`[backtest] collecting ${season} schedule (to get real kbo_game_id per game)...`);
const games = await collectSeason({ season, months: [3, 4, 5, 6, 7, 8] });
console.log(`[backtest]   ${games.length} games total`);

const finalWithId = games.filter((g) => g.status === 'FINAL' && g.kbo_game_id);
const finalWithoutId = games.filter((g) => g.status === 'FINAL' && !g.kbo_game_id);
console.log(`[backtest]   ${finalWithId.length} FINAL games have a real KBO game id; ${finalWithoutId.length} FINAL games do not (excluded)`);

console.log(`[backtest] fetching ${finalWithId.length} box scores (sequential, ~250ms apart)...`);
let lastLogged = 0;
const { results, errors } = await fetchBoxScores(
  finalWithId.map((g) => ({ gameId: g.kbo_game_id, asOf: g.date, homeTeam: g.home, awayTeam: g.away })),
  {
    delayMs: 250,
    onProgress: ({ done, total }) => {
      if (done - lastLogged >= 25 || done === total) { console.log(`[backtest]   ${done}/${total}`); lastLogged = done; }
    },
  }
);
console.log(`[backtest] fetched ${results.length} box scores, ${errors.length} failures`);
if (errors.length) console.log('[backtest] failures:', errors.slice(0, 10));

const boxScoresByGameId = Object.fromEntries(
  finalWithId
    .filter((g) => results.find((r) => r.game_id === g.kbo_game_id))
    .map((g) => [g.game_id, results.find((r) => r.game_id === g.kbo_game_id)])
);

await fs.writeFile(outFile, JSON.stringify({ season, collected_games: results.length, failures: errors, boxScoresByGameId }, null, 2));
console.log(`[backtest] wrote raw box scores -> ${outFile}`);

console.log('[backtest] running evaluateIntegratedBacktest WITHOUT box scores (offense/bullpen pinned at 0, matches V0.9.4)...');
const withoutBox = evaluateIntegratedBacktest(games, { steps: [0.25, 0.1, 0.05, 0.02] });

console.log('[backtest] running evaluateIntegratedBacktest WITH real box-score offense/bullpen (baseline weights unchanged, .55/.35)...');
const withBox = evaluateIntegratedBacktest(games, { steps: [0.25, 0.1, 0.05, 0.02], boxScoresByGameId });

console.log('[backtest] running weight optimization WITH box scores, letting offense/bullpen tune too (in addition to elo/recent/home)...');
const withBoxTuned = evaluateIntegratedBacktest(games, {
  steps: [0.25, 0.1, 0.05, 0.02],
  fields: ['elo', 'recent', 'home', 'offense', 'bullpen'],
  boxScoresByGameId,
});

const report = {
  season,
  split: withoutBox.optimized.split,
  baseline_weights: withoutBox.baseline,
  without_box_scores: { baseline_train: withoutBox.baseline_train, baseline_validation: withoutBox.baseline_validation },
  with_box_scores_baseline_weights: { baseline_train: withBox.baseline_train, baseline_validation: withBox.baseline_validation },
  with_box_scores_tuned_weights: { weights: withBoxTuned.optimized.weights, train_metrics: withBoxTuned.optimized.train_metrics, validation_metrics: withBoxTuned.optimized.validation_metrics },
};

const reportFile = outFile.replace(/\.json$/, '-report.json');
await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
console.log(`[backtest] wrote comparison report -> ${reportFile}`);
console.log(JSON.stringify(report, null, 2));
