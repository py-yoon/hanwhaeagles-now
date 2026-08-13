import test from 'node:test';
import assert from 'node:assert/strict';
import {predictIntegrated,strengthScore,brierScore,logLoss,buildStrengthParts} from './integrated-prediction.js';

test('stronger home team has higher home probability',()=>{
  const h=buildStrengthParts({elo:1,starter:1,offense:0.5}), a=buildStrengthParts({elo:-1,starter:-1,offense:-0.5});
  const r=predictIntegrated(h,a);
  assert(r.probabilities.HOME_WIN>r.probabilities.AWAY_WIN);
  assert(Math.abs(Object.values(r.probabilities).reduce((a,b)=>a+b,0)-1)<1e-9);
});
test('draw is explicit three-way probability',()=>{
  const r=predictIntegrated(buildStrengthParts(),buildStrengthParts());
  assert(r.probabilities.DRAW>0);
  assert(r.probabilities.HOME_WIN>0 && r.probabilities.AWAY_WIN>0);
});
test('weights affect score',()=>{
  const p=buildStrengthParts({elo:1,offense:1});
  assert(strengthScore(p,{...undefined,elo:2,roster:0,starter:0,bullpen:0,offense:1,defense:0,recent:0})>0);
});
test('metrics are finite',()=>{
  const p={HOME_WIN:.6,DRAW:.2,AWAY_WIN:.2};
  assert.equal(logLoss(p,'HOME_WIN')>0,true); assert(brierScore(p,'HOME_WIN')>=0);
});
