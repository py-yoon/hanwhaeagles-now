import test from 'node:test';
import assert from 'node:assert/strict';
import {resolvePregameStarter, updatePregameForecast, shouldReforecast} from './pregame-update.js';

const game={game_id:'G1',date:'2026-08-12T18:30:00+09:00',home:'DOOSAN',away:'HANWHA',status:'SCHEDULED'};
const base={DOOSAN:{elo:1,starter:0,offense:0},HANWHA:{elo:-1,starter:0,offense:0}};

test('confirmed starter replaces only the matching team starter',()=>{
  const r=resolvePregameStarter(game,base,[{game_id:'G1',team:'HANWHA',player:'White',strength:2,status:'CONFIRMED',effective_at:'2026-08-12T10:00:00+09:00'}],game.date);
  assert.equal(r.snapshots.HANWHA.starter,2);
  assert.equal(r.snapshots.DOOSAN.starter,0);
  assert.equal(r.applied.length,1);
});

test('future starter announcement is excluded',()=>{
  const r=resolvePregameStarter(game,base,[{game_id:'G1',team:'HANWHA',player:'Future',strength:9,status:'CONFIRMED',effective_at:'2026-08-12T19:00:00+09:00'}],game.date);
  assert.equal(r.applied.length,0);
  assert.equal(r.snapshots.HANWHA.starter,0);
});

test('unconfirmed starter does not alter forecast',()=>{
  const r=updatePregameForecast(game,base,[{game_id:'G1',team:'HANWHA',player:'TBD',strength:5,status:'TBD',effective_at:'2026-08-12T09:00:00+09:00'}],{asOf:game.date});
  assert.equal(r.forecast_revision,'BASELINE');
  assert.equal(r.update_count,0);
});

test('confirmed starter causes a forecast revision',()=>{
  const r=updatePregameForecast(game,base,[{game_id:'G1',team:'HANWHA',player:'White',strength:2,status:'CONFIRMED',effective_at:'2026-08-12T10:00:00+09:00'}],{asOf:game.date});
  assert.equal(r.forecast_revision,'STARTER_UPDATED');
  assert.equal(r.update_count,1);
  assert.ok(r.probabilities.HOME_WIN+r.probabilities.DRAW+r.probabilities.AWAY_WIN>0.999);
});

test('same applied starter state does not require reforecast',()=>{
  const a={starter_updates_applied:[{team:'HANWHA',player_id:'1',effective_at:'2026-08-12T10:00:00.000Z'}]};
  const b={starter_updates_applied:[{team:'HANWHA',player_id:'1',effective_at:'2026-08-12T10:00:00.000Z'}]};
  assert.equal(shouldReforecast(a,b),false);
});

test('changed starter state requires reforecast',()=>{
  const a={starter_updates_applied:[{team:'HANWHA',player_id:'1'}]};
  const b={starter_updates_applied:[{team:'HANWHA',player_id:'2'}]};
  assert.equal(shouldReforecast(a,b),true);
});
