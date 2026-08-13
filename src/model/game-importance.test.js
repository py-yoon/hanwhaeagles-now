import test from 'node:test';import assert from 'node:assert/strict';import {estimateGameImportance} from './game-importance.js';
const standings=[{team:'HANWHA',wins:40,losses:40,draws:0},{team:'DOOSAN',wins:39,losses:41,draws:0},{team:'NC',wins:38,losses:42,draws:0},{team:'LOTTE',wins:37,losses:43,draws:0}];
const games=[{game_id:'A',home:'HANWHA',away:'NC',status:'SCHEDULED',date:'2026-08-13'},{game_id:'B',home:'DOOSAN',away:'LOTTE',status:'SCHEDULED',date:'2026-08-13'}];
const snapshots={HANWHA:{},DOOSAN:{},NC:{},LOTTE:{}};
test('game importance returns conditional outcomes',()=>{const base={standings,games,snapshots,focusTeam:'HANWHA',iterations:1000,seed:7,asOf:'2026-08-12',playoff_probability:.5};const r=estimateGameImportance({base,gameId:'A',iterations:1000,seed:7});assert.equal(r.conditional.length,3);assert(r.impact_range>=0);});
