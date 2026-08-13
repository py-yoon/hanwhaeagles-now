import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { verifySnapshots } from './season.js';
import { rankTeams } from '../engine/standings.js';

const f=JSON.parse(fs.readFileSync('data/fixtures/season-2026-early-april.json','utf8'));

test('early-April chain contains 40 final games across 8 active dates',()=>{
  assert.equal(f.games.length,40);
  const byDate=Object.groupBy(f.games,g=>g.date);
  assert.deepEqual(Object.keys(byDate),['2026-03-28','2026-03-29','2026-03-31','2026-04-01','2026-04-02','2026-04-03','2026-04-04','2026-04-05']);
  assert.ok(Object.values(byDate).every(x=>x.length===5));
});

test('season replay verifies 2026-04-05 official snapshot',()=>{
  const result=verifySnapshots({initialStandings:f.initial_standings,games:f.games,snapshots:f.snapshots});
  assert.equal(result.status,'PASS');
  assert.equal(result.snapshots_checked,1);
  assert.equal(result.results[0].games_checked,40);
  assert.deepEqual(result.results[0].mismatches,[]);
});

test('KBO-style tied winning percentages share rank',()=>{
  const ranked=rankTeams([{team:'A',wins:2,losses:0,draws:0},{team:'B',wins:2,losses:0,draws:0},{team:'C',wins:1,losses:1,draws:0}]);
  assert.deepEqual(ranked.map(x=>x.rank),[1,1,3]);
});
