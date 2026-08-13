import test from 'node:test';import assert from 'node:assert/strict';import {runModelUncertainty} from './model-uncertainty.js';
const standings=[{team:'HANWHA',wins:40,losses:40,draws:0},{team:'DOOSAN',wins:39,losses:41,draws:0},{team:'NC',wins:38,losses:42,draws:0},{team:'LOTTE',wins:37,losses:43,draws:0}];
const games=[{game_id:'A',home:'HANWHA',away:'NC',status:'SCHEDULED',date:'2026-08-13'}];const snapshots={HANWHA:{elo:1500},DOOSAN:{elo:1500},NC:{elo:1500},LOTTE:{elo:1500}};
test('uncertainty returns intervals',()=>{const r=runModelUncertainty({standings,games,snapshots,focusTeam:'HANWHA',asOf:'2026-08-12'},{members:3,iterations:1000});assert(r.playoff_probability.p10<=r.playoff_probability.median);assert(r.playoff_probability.median<=r.playoff_probability.p90);});
