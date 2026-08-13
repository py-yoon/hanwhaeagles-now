import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateMonteCarlo } from './monte-carlo.js';
test('monte carlo exposes rank quantiles',()=>{
 const r=simulateMonteCarlo([{team:'HANWHA',wins:40,losses:40,draws:0},{team:'LG',wins:45,losses:35,draws:0}],[],{iterations:1000,focusTeam:'HANWHA',random:()=>0.1});
 assert.ok(r.rank_quantiles.p10>=1 && r.rank_quantiles.p90<=2);
});
