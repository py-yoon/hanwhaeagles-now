import test from 'node:test';
import assert from 'node:assert/strict';
import { generateOutcomes, evaluateScenarios, summarizeScenarios } from './scenario.js';

const standings = [
  { team: 'HANWHA', wins: 6, losses: 5, draws: 0 },
  { team: 'A', wins: 7, losses: 4, draws: 0 },
  { team: 'B', wins: 7, losses: 4, draws: 0 },
  { team: 'C', wins: 6, losses: 5, draws: 0 }
];
const games = [
  { game_id: 'G1', home: 'HANWHA', away: 'A' },
  { game_id: 'G2', home: 'B', away: 'C' }
];

test('scenario generator includes win/loss/draw and produces 3^N cases', () => {
  assert.equal(generateOutcomes(games).length, 9);
  assert.deepEqual(new Set(generateOutcomes(games).flat().map(x => x.outcome)), new Set(['HOME_WIN','AWAY_WIN','DRAW']));
});

test('scenario evaluation preserves draw records', () => {
  const results = evaluateScenarios(standings, games);
  assert.equal(results.length, 9);
  const drawCase = results.find(r => r.outcomes.every(x => x.outcome === 'DRAW'));
  assert.ok(drawCase);
  const h = drawCase.standings.find(t => t.team === 'HANWHA');
  assert.equal(h.draws, 1);
  assert.equal(h.games, 12);
});

test('scenario summary returns rank distribution', () => {
  const summary = summarizeScenarios(evaluateScenarios(standings, games));
  assert.equal(summary.total, 9);
  assert.equal(summary.best_rank, 1);
  assert.ok(summary.worst_rank >= summary.best_rank);
  assert.equal(Object.values(summary.rank_distribution).reduce((a, b) => a + b, 0), 9);
});
