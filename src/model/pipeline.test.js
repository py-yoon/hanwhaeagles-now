import test from 'node:test';import assert from 'node:assert/strict';import {runProductionPipeline} from './pipeline.js';
const input={sourceStatus:'fixture',standings:[{team:'HANWHA',wins:40,losses:40,draws:0},{team:'DOOSAN',wins:39,losses:41,draws:0},{team:'NC',wins:38,losses:42,draws:0},{team:'LOTTE',wins:37,losses:43,draws:0}],games:[{game_id:'A',home:'HANWHA',away:'NC',status:'SCHEDULED',date:'2026-08-13'}],snapshots:{HANWHA:{elo:1500},DOOSAN:{elo:1500},NC:{elo:1500},LOTTE:{elo:1500}},asOf:'2026-08-12',focusTeam:'HANWHA'};
test('production gate blocks fixture',()=>assert.throws(()=>runProductionPipeline(input,{iterations:1000}),/production gate blocked/));
test('fixture mode can execute',()=>{const r=runProductionPipeline(input,{allowFixture:true,iterations:1000,uncertaintyIterations:1000,sensitivityIterations:1000,members:3});assert.equal(r.status,'PASS');});
test('report provenance reflects the real source_status, not a hardcoded default',()=>{
  const liveInput={...input,sourceStatus:'live'};
  const r=runProductionPipeline(liveInput,{iterations:1000,uncertaintyIterations:1000,sensitivityIterations:1000,members:3});
  assert.equal(r.report.provenance.source_status,'live');
});
