import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLiveCoverage, assertProductionCoverage } from './live-coverage-gate.js';

test('matches replayed team games against official snapshot', () => {
  const games = [
    {game_id:'a',date:'2026-08-12',home:'HANWHA',away:'DOOSAN',home_score:4,away_score:3,status:'FINAL'},
    {game_id:'b',date:'2026-08-12',home:'LG',away:'KIA',home_score:2,away_score:1,status:'FINAL'}
  ];
  const r = validateLiveCoverage({games, asOfDate:'2026-08-12', standings:[
    {team:'HANWHA',games:1},{team:'DOOSAN',games:1},{team:'LG',games:1},{team:'KIA',games:1}
  ]});
  assert.equal(r.status,'PASS');
});

test('blocks a missing team game', () => {
  const r = validateLiveCoverage({
    games:[{game_id:'a',date:'2026-08-12',home:'HANWHA',away:'DOOSAN',home_score:4,away_score:3,status:'FINAL'}],
    asOfDate:'2026-08-12', standings:[{team:'HANWHA',games:2},{team:'DOOSAN',games:1}]
  });
  assert.equal(r.status,'FAIL');
  assert.equal(r.errors[0].reason,'TEAM_GAME_COUNT_MISMATCH');
});

test('production coverage requires ten teams', () => {
  const r = validateLiveCoverage({
    games:[{game_id:'a',date:'2026-08-12',home:'HANWHA',away:'DOOSAN',home_score:4,away_score:3,status:'FINAL'}],
    asOfDate:'2026-08-12'
  });
  assert.throws(() => assertProductionCoverage(r), /10/);
});
