import test from 'node:test';
import assert from 'node:assert/strict';
import { filterRemainingGames, attachEloProbabilities, validateRemainingSchedule } from './remaining-schedule.js';

const teams=['HANWHA','DOOSAN','SAMSUNG','LG'];
const games=[
 {game_id:'g1',date:'2026-08-12',home:'DOOSAN',away:'HANWHA',status:'SCHEDULED'},
 {game_id:'g2',date:'2026-08-13',home:'HANWHA',away:'DOOSAN',status:'SCHEDULED'},
 {game_id:'g3',date:'2026-08-11',home:'LG',away:'SAMSUNG',status:'FINAL'},
];

test('filters only future scheduled games',()=>{
 const r=filterRemainingGames(games,'2026-08-11');
 assert.deepEqual(r.map(x=>x.game_id),['g1','g2']);
});

test('attaches 3-way Elo probabilities',()=>{
 const r=attachEloProbabilities(games.slice(0,1),{DOOSAN:1500,HANWHA:1500},{homeAdvantage:50,drawProbability:0.06});
 assert.equal(Object.keys(r[0].probabilities).length,3);
 assert.ok(Math.abs(Object.values(r[0].probabilities).reduce((a,b)=>a+b,0)-1)<1e-12);
});

test('validates schedule integrity',()=>{
 assert.equal(validateRemainingSchedule(games.slice(0,2),teams).status,'PASS');
 assert.equal(validateRemainingSchedule([{...games[0],home:'UNKNOWN'}],teams).status,'FAIL');
});
