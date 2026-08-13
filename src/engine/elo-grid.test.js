import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateEloGrid } from './elo-grid.js';

test('default Elo grid evaluates 25 models', () => {
  const games=[
    {game_id:'1',date:'2026-01-01',home:'A',away:'B',home_score:1,away_score:0,status:'FINAL'},
    {game_id:'2',date:'2026-01-02',home:'B',away:'A',home_score:2,away_score:0,status:'FINAL'},
    {game_id:'3',date:'2026-01-03',home:'A',away:'B',home_score:1,away_score:1,status:'FINAL'}
  ];
  const r=evaluateEloGrid(games);
  assert.equal(r.results.length,25);
  assert.ok(r.best_by_log_loss);
  assert.ok(r.best_by_brier);
});

test('grid passes team list and preserves walk-forward behavior', () => {
  const games=[{game_id:'1',date:'2026-01-01',home:'A',away:'B',home_score:1,away_score:0,status:'FINAL'}];
  const r=evaluateEloGrid(games,{kFactors:[20],homeAdvantages:[50],teams:['A','B']});
  assert.equal(r.results[0].games,1);
  assert.equal(r.results[0].kFactor,20);
  assert.equal(r.results[0].homeAdvantage,50);
});
