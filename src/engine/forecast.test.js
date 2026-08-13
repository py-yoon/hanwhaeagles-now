import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateFinalStandings, gameImpact } from './forecast.js';

const standings=[
 {team:'HANWHA',wins:44,losses:45,draws:3},
 {team:'DOOSAN',wins:48,losses:44,draws:3},
 {team:'SAMSUNG',wins:57,losses:35,draws:2},
 {team:'LG',wins:53,losses:41,draws:0},
 {team:'KIA',wins:50,losses:44,draws:2},
 {team:'NC',wins:42,losses:47,draws:2},
 {team:'LOTTE',wins:41,losses:51,draws:2},
 {team:'SSG',wins:36,losses:56,draws:4},
 {team:'KIWOOM',wins:35,losses:60,draws:2},
 {team:'KT',wins:53,losses:36,draws:2}
];
const games=[
 {game_id:'r1',date:'2026-07-27',home:'HANWHA',away:'DOOSAN',status:'SCHEDULED',probabilities:{HOME_WIN:.5,AWAY_WIN:.45,DRAW:.05}},
 {game_id:'r2',date:'2026-07-28',home:'DOOSAN',away:'HANWHA',status:'SCHEDULED',probabilities:{HOME_WIN:.5,AWAY_WIN:.45,DRAW:.05}},
 {game_id:'r3',date:'2026-07-29',home:'HANWHA',away:'NC',status:'SCHEDULED',probabilities:{HOME_WIN:.55,AWAY_WIN:.4,DRAW:.05}}
];

test('forecast returns rank distribution and postseason probability',()=>{
 const r=simulateFinalStandings(standings,games,{iterations:2000,seed:7});
 assert.equal(r.iterations,2000);
 assert.equal(r.focus_team,'HANWHA');
 assert.ok(r.postseason_probability>=0 && r.postseason_probability<=1);
 assert.equal(Object.keys(r.rank_distribution).length,10);
});

test('game impact returns conditional probabilities',()=>{
 const r=gameImpact(standings,games,'r1',{iterations:1000,seed:9});
 assert.equal(Object.keys(r.conditions).length,3);
 assert.ok(r.range_probability_points>=0);
});
