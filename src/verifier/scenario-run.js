import fs from 'node:fs';
import { evaluateScenarios, summarizeScenarios } from '../engine/scenario.js';

const fixture = JSON.parse(fs.readFileSync('data/fixtures/scenario-demo.json', 'utf8'));
const results = evaluateScenarios(fixture.standings, fixture.games, fixture.focus_team);
const summary = summarizeScenarios(results);
console.log(JSON.stringify({
  focus_team: fixture.focus_team,
  games_checked: fixture.games.length,
  ...summary,
  best_examples: summary.best_cases.slice(0, 3).map(x => x.outcomes),
  worst_examples: summary.worst_cases.slice(0, 3).map(x => x.outcomes)
}, null, 2));
