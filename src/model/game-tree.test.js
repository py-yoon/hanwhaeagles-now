import test from 'node:test';import assert from 'node:assert/strict';import {estimateGameTree, headToHeadRecord} from './game-tree.js';
const standings=[{team:'HANWHA',wins:40,losses:40,draws:0},{team:'DOOSAN',wins:42,losses:38,draws:0},{team:'NC',wins:38,losses:42,draws:0},{team:'LOTTE',wins:37,losses:43,draws:0}];
const games=[
  {game_id:'20260813-HANWHA-DOOSAN-1',home:'DOOSAN',away:'HANWHA',status:'SCHEDULED',date:'2026-08-13'},
  {game_id:'20260814-NC-HANWHA-1',home:'HANWHA',away:'NC',status:'SCHEDULED',date:'2026-08-14'},
  {game_id:'20260601-HANWHA-DOOSAN-1',home:'HANWHA',away:'DOOSAN',status:'FINAL',date:'2026-06-01',home_score:5,away_score:2},
];
const snapshots={HANWHA:{},DOOSAN:{},NC:{},LOTTE:{}};
const base={standings,games,snapshots,focusTeam:'HANWHA',asOf:'2026-08-12'};

test('game tree builds a full binary tree with 2^n-1 decided leaves',()=>{
  const r=estimateGameTree({base,gameIds:['20260813-HANWHA-DOOSAN-1','20260814-NC-HANWHA-1'],iterations:1000,seed:7});
  assert.equal(r.target_games.length,2);
  assert.equal(r.tree.depth,0);
  assert.equal(r.tree.win.win.decided.length,2);
  assert.equal(r.tree.win.lose.decided[0].result,'WIN');
  assert.equal(r.tree.lose.decided[0].result,'LOSS');
  assert(r.root_playoff_probability>=0 && r.root_playoff_probability<=1);
});

test('head to head record counts only FINAL games for the given opponents',()=>{
  const h2h=headToHeadRecord(games,'HANWHA',['DOOSAN','NC']);
  assert.deepEqual(h2h.DOOSAN,{games:1,wins:1,losses:0,draws:0,win_rate:1});
  assert.deepEqual(h2h.NC,{games:0,wins:0,losses:0,draws:0,win_rate:null});
});
