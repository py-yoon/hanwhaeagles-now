import test from 'node:test';
import assert from 'node:assert/strict';
import {forecastGame,forecastSchedule} from './game-forecast.js';

test('future game receives three-way probabilities',()=>{
  const r=forecastGame({game_id:'g1',date:'2026-08-13',status:'SCHEDULED',home:'HANWHA',away:'DOOSAN'},
    {HANWHA:{elo:1,starter:.5,offense:.3},DOOSAN:{elo:-1,starter:-.2,offense:-.1}});
  assert.equal(r.status,'FORECAST');
  assert(Math.abs(Object.values(r.probabilities).reduce((a,b)=>a+b,0)-1)<1e-9);
  assert(r.probabilities.HOME_WIN>r.probabilities.AWAY_WIN);
});

test('final games never get forecast',()=>{
  assert.equal(forecastGame({game_id:'g2',status:'FINAL',home:'A',away:'B'},{A:{},B:{}}).status,'SKIPPED_FINAL');
});

test('non-future games never get forecast',()=>{
  assert.equal(forecastGame({game_id:'g3',status:'LIVE',home:'A',away:'B'},{A:{},B:{}}).status,'SKIPPED_NON_FUTURE');
});

test('schedule is chronological and excludes non-future',()=>{
  const r=forecastSchedule([
    {game_id:'2',date:'2026-08-14',status:'SCHEDULED',home:'A',away:'B'},
    {game_id:'1',date:'2026-08-13',status:'SCHEDULED',home:'A',away:'B'},
    {game_id:'3',date:'2026-08-12',status:'FINAL',home:'A',away:'B'}
  ],{A:{},B:{}});
  assert.deepEqual(r.map(x=>x.game_id),['1','2']);
});
