import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { auditSeasonGames } from './season-audit.js';

test('audits early-April fixture without false missing-date errors', () => {
  const f = JSON.parse(fs.readFileSync('data/fixtures/season-2026-early-april.json','utf8'));
  const teams = f.initial_standings.map(x => x.team);
  const r = auditSeasonGames(f.games, { teams });
  assert.equal(r.status, 'PASS');
  assert.equal(r.games, 40);
  assert.equal(r.active_dates, 8);
  assert.equal(r.date_range.from, '2026-03-28');
  assert.equal(r.date_range.to, '2026-04-05');
});

test('flags duplicate ids and same-team games', () => {
  const games = [
    {game_id:'x',date:'2026-04-01',home:'A',away:'B',home_score:1,away_score:0,status:'FINAL'},
    {game_id:'x',date:'2026-04-01',home:'A',away:'A',home_score:2,away_score:1,status:'FINAL'}
  ];
  const r = auditSeasonGames(games,{teams:['A','B']});
  assert.equal(r.status,'FAIL');
  assert.ok(r.errors.some(x=>x.reason==='DUPLICATE_GAME_ID'));
  assert.ok(r.errors.some(x=>x.reason==='SAME_HOME_AWAY'));
});
