import fs from 'node:fs';
import { createSeededRng, simulateMonteCarlo } from '../engine/monte-carlo.js';

const fixture = JSON.parse(fs.readFileSync('data/fixtures/monte-carlo-demo.json', 'utf8'));
const result = simulateMonteCarlo(fixture.standings, fixture.games, {
  iterations: fixture.iterations,
  focusTeam: fixture.focus_team,
  random: createSeededRng(fixture.seed)
});
console.log(JSON.stringify({
  focus_team: result.focus_team,
  iterations: result.iterations,
  games_checked: fixture.games.length,
  best_rank: result.best_rank,
  worst_rank: result.worst_rank,
  expected_rank: result.expected_rank,
  top3_probability: result.top3_probability,
  rank_distribution: result.rank_distribution,
  sampled_outcome_distribution: result.sampled_outcome_distribution,
  best_examples: result.best_cases,
  worst_examples: result.worst_cases
}, null, 2));
