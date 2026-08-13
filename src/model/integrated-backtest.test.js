import test from 'node:test';
import assert from 'node:assert/strict';
import {chronologicalSplit,optimizeIntegratedWeights,evaluateIntegratedBacktest} from './integrated-backtest.js';

const games=Array.from({length:10},(_,i)=>({game_id:`g${i}`,date:`2026-03-${String(i+1).padStart(2,'0')}`,home:'A',away:'B',home_score:i%3===0?5:2,away_score:i%3===0?2:4,status:'FINAL'}));

test('split is chronological and non-empty',()=>{const s=chronologicalSplit(games,.7);assert.equal(s.cut,7);assert.equal(s.train[1],s.validation[0]);});
test('optimization is deterministic',()=>{const a=optimizeIntegratedWeights(games,{steps:[.1,.05]}),b=optimizeIntegratedWeights(games,{steps:[.1,.05]});assert.deepEqual(a.weights,b.weights);assert.deepEqual(a.validation_metrics,b.validation_metrics);});
test('validation is strictly after training cut',()=>{const r=optimizeIntegratedWeights(games,{trainFraction:.6,steps:[.1]});assert.equal(r.split.train_games,6);assert.equal(r.split.validation_games,4);assert(r.split.cut<10);});
test('backtest returns baseline and optimized metrics',()=>{const r=evaluateIntegratedBacktest(games,{steps:[.1]});assert(Number.isFinite(r.optimized.validation_metrics.log_loss));assert(Number.isFinite(r.baseline_validation.log_loss));});
