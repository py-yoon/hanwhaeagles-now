import test from 'node:test';
import assert from 'node:assert/strict';
import {chronologicalSplit,optimizeIntegratedWeights,evaluateIntegratedBacktest} from './integrated-backtest.js';

const games=Array.from({length:10},(_,i)=>({game_id:`g${i}`,date:`2026-03-${String(i+1).padStart(2,'0')}`,home:'A',away:'B',home_score:i%3===0?5:2,away_score:i%3===0?2:4,status:'FINAL'}));

test('split is chronological and non-empty',()=>{const s=chronologicalSplit(games,.7);assert.equal(s.cut,7);assert.equal(s.train[1],s.validation[0]);});
test('optimization is deterministic',()=>{const a=optimizeIntegratedWeights(games,{steps:[.1,.05]}),b=optimizeIntegratedWeights(games,{steps:[.1,.05]});assert.deepEqual(a.weights,b.weights);assert.deepEqual(a.validation_metrics,b.validation_metrics);});
test('validation is strictly after training cut',()=>{const r=optimizeIntegratedWeights(games,{trainFraction:.6,steps:[.1]});assert.equal(r.split.train_games,6);assert.equal(r.split.validation_games,4);assert(r.split.cut<10);});
test('backtest returns baseline and optimized metrics',()=>{const r=evaluateIntegratedBacktest(games,{steps:[.1]});assert(Number.isFinite(r.optimized.validation_metrics.log_loss));assert(Number.isFinite(r.baseline_validation.log_loss));});

test('box scores feed offense/bullpen only starting from the game AFTER they were played (no lookahead)',()=>{
  const strongBoxScore={
    battingRows:Array.from({length:9},(_,i)=>({player_id:`A-p${i}`,team:'A',as_of:'2026-03-10',AB:5,H:5,HR:2,RBI:3,TB:0,BB:0,HBP:0,SF:0,SO:0})),
    pitchingRows:[],
  };
  const withoutBox=evaluateIntegratedBacktest(games,{steps:[.1]});

  // Attached to the LAST game (g9): apply() only adds a game's box score to state AFTER that
  // game is scored, and no game follows g9, so this can never be consumed by any
  // featuresFromState call — results must be byte-identical to not supplying it at all.
  const withLastGameBox=evaluateIntegratedBacktest(games,{steps:[.1],boxScoresByGameId:{g9:strongBoxScore}});
  assert.deepEqual(withLastGameBox.baseline_train,withoutBox.baseline_train);
  assert.deepEqual(withLastGameBox.baseline_validation,withoutBox.baseline_validation);

  // Attached to the FIRST game (g0) instead: every later game (g1..g9) now sees it in team A's
  // accumulated offense, so predictions -- and therefore metrics -- must actually change.
  const withFirstGameBox=evaluateIntegratedBacktest(games,{steps:[.1],boxScoresByGameId:{g0:strongBoxScore}});
  assert.notDeepEqual(withFirstGameBox.baseline_validation,withoutBox.baseline_validation);
});
