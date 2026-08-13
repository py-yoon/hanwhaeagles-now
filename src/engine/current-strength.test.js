import test from 'node:test';
import assert from 'node:assert/strict';
import {weightedStrength,componentConfidence,buildCurrentStrengthSnapshot,validateStrengthSnapshot} from './current-strength.js';

test('weightedStrength normalizes weights',()=>assert.equal(weightedStrength({elo:1,offense:0},{elo:2,offense:1}),2/3));
test('confidence increases with evidence',()=>assert.ok(componentConfidence({games:80,players:20,starterSamples:10,bullpenIP:80}).overall>componentConfidence({games:2,players:2,starterSamples:1,bullpenIP:2}).overall));
test('snapshot ranks teams deterministically',()=>{const s=buildCurrentStrengthSnapshot({teams:['A','B'],elo:{A:1550,B:1450},components:{A:{offense:1},B:{offense:-1}},metadata:{asOf:'2026-08-12'}});assert.equal(s.rows[0].team,'A');assert.equal(s.rows[0].strength_rank,1);});
test('snapshot validation passes valid 10-team shape',()=>{const teams=Array.from({length:10},(_,i)=>`T${i}`);const s=buildCurrentStrengthSnapshot({teams,elo:Object.fromEntries(teams.map((t,i)=>[t,1500+i])),components:{},metadata:{asOf:'2026-08-12'}});assert.equal(validateStrengthSnapshot(s).status,'PASS');});
test('invalid duplicate snapshot fails',()=>{const s={rows:[{team:'A',strength:1,elo:1500,strength_rank:1},{team:'A',strength:.5,elo:1490,strength_rank:2}]};assert.equal(validateStrengthSnapshot(s,2).status,'FAIL');});
