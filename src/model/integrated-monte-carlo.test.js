import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIntegratedFutureGames, runIntegratedMonteCarlo } from './integrated-monte-carlo.js';
import fs from 'node:fs';

const fixture = JSON.parse(fs.readFileSync('data/fixtures/integrated-monte-carlo-demo.json','utf8'));

test('builds forecast probabilities for future games only', () => {
  const games = buildIntegratedFutureGames(fixture.games, fixture.snapshots, {asOf: fixture.asOf});
  assert.equal(games.length, 4);
  for (const g of games) assert.ok(Math.abs(Object.values(g.probabilities).reduce((a,b)=>a+b,0)-1) < 1e-9);
});

test('100k integrated monte carlo is deterministic with seed', () => {
  const a = runIntegratedMonteCarlo(fixture);
  const b = runIntegratedMonteCarlo(fixture);
  assert.deepEqual(a.monte_carlo.rank_distribution, b.monte_carlo.rank_distribution);
  assert.equal(a.iterations, 100000);
});

test('does not retain 100k samples by default', () => {
  const r = runIntegratedMonteCarlo({...fixture, iterations: 1000});
  assert.ok(!('samples' in r.monte_carlo));
});

test('excludes non-future states', () => {
  const games = [...fixture.games, {game_id:'LIVE',date:'2026-08-13T18:30:00+09:00',status:'LIVE',home:'HANWHA',away:'A'}];
  assert.equal(buildIntegratedFutureGames(games, fixture.snapshots, {asOf: fixture.asOf}).length, 4);
});
