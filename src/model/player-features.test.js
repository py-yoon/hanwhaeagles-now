import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateTeamPlayerStats, makePregamePlayerSnapshot, playerFeatureDiff, shrinkRate } from './player-features.js';

test('aggregates batter and pitcher features by team',()=>{
  const rows=[
    {player_id:'1',team:'HANWHA',as_of:'2026-04-01',PA:100,AB:90,H:27,TB:42,BB:8,HBP:2,SO:20,HR:2,SF:1,IP:20,pitcher_H:18,pitcher_HR:2,pitcher_BB:6,pitcher_SO:18,ER:7,TBF:80},
    {player_id:'2',team:'HANWHA',as_of:'2026-04-01',PA:50,AB:45,H:12,TB:20,BB:4,HBP:1,SO:10,HR:1,SF:0,IP:10,pitcher_H:9,pitcher_HR:1,pitcher_BB:3,pitcher_SO:8,ER:4,TBF:40},
    {player_id:'3',team:'LG',as_of:'2026-04-01',PA:80,AB:70,H:20,TB:32,BB:7,HBP:1,SO:16,HR:2,SF:1,IP:15,pitcher_H:16,pitcher_HR:2,pitcher_BB:5,pitcher_SO:15,ER:8,TBF:65}
  ];
  const x=aggregateTeamPlayerStats(rows,{asOf:'2026-04-01'});
  assert.equal(x.HANWHA.batter.pa,150); assert.ok(x.HANWHA.batter.ops>0); assert.ok(x.HANWHA.pitcher.era>0);
});

test('blocks look-ahead player rows',()=>{
  const rows=[{player_id:'1',team:'A',as_of:'2026-04-03',PA:1},{player_id:'2',team:'A',as_of:'2026-04-04',PA:2}];
  assert.throws(()=>makePregamePlayerSnapshot(rows,'2026-04-03'),/Look-ahead/);
});

test('shrinkage moves small samples toward prior',()=>{ assert.ok(shrinkRate(1,1,0.5,100)<0.51); });

test('feature diff is deterministic',()=>{
  const rows=[{player_id:'1',team:'A',as_of:'2026-04-01',PA:100,AB:100,H:40,TB:60,BB:0,HBP:0,SO:10,SF:0,HR:5,IP:10,pitcher_H:5,pitcher_HR:0,pitcher_BB:1,pitcher_SO:12,ER:2,TBF:35},{player_id:'2',team:'B',as_of:'2026-04-01',PA:100,AB:100,H:20,TB:30,BB:0,HBP:0,SO:30,SF:0,HR:1,IP:10,pitcher_H:15,pitcher_HR:3,pitcher_BB:5,pitcher_SO:5,ER:10,TBF:45}];
  const x=aggregateTeamPlayerStats(rows,{asOf:'2026-04-01'}); const d=playerFeatureDiff(x.A,x.B); assert.ok(d.batting_ops>0); assert.ok(Number.isFinite(d.pitching_era));
});
