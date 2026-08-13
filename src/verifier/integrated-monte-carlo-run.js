import fs from 'node:fs';
import { runIntegratedMonteCarlo } from '../model/integrated-monte-carlo.js';
const file = process.argv[2] ?? 'data/fixtures/integrated-monte-carlo-demo.json';
if (!fs.existsSync(file)) throw new Error(`missing fixture: ${file}`);
const input = JSON.parse(fs.readFileSync(file,'utf8'));
const result = runIntegratedMonteCarlo(input);
console.log(JSON.stringify({
  model_version: result.model_version,
  focus_team: result.focus_team,
  iterations: result.iterations,
  future_games: result.future_games,
  playoff_probability: result.playoff_probability,
  expected_rank: result.monte_carlo.expected_rank,
  best_rank: result.monte_carlo.best_rank,
  worst_rank: result.monte_carlo.worst_rank,
  rank_distribution: result.monte_carlo.rank_distribution,
  forecasts: result.forecasts.map(g => ({game_id:g.game_id,home:g.home,away:g.away,probabilities:g.probabilities}))
}, null, 2));
