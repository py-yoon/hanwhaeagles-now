import test from 'node:test';
import assert from 'node:assert/strict';
import { expectedScore, gameProbabilities, walkForwardBacktest, buildEloTimeline, eloSnapshotAtDate } from './elo.js';

test('equal Elo with home advantage favors home', () => assert.ok(expectedScore(1500,1500,50) > 0.5));
test('three-way probabilities sum to one', () => { const p=gameProbabilities(1500,1500); assert.ok(Math.abs(p.HOME_WIN+p.AWAY_WIN+p.DRAW-1)<1e-12); });
test('walk-forward never uses current result before prediction', () => { const r=walkForwardBacktest([{game_id:'1',date:'2026-01-01',home:'A',away:'B',home_score:1,away_score:0,status:'FINAL'},{game_id:'2',date:'2026-01-02',home:'A',away:'B',home_score:0,away_score:1,status:'FINAL'}]); assert.equal(r.games,2); assert.notEqual(r.rows[0].home_elo_before,r.rows[1].home_elo_before); });


test('timeline stores Elo immediately before and after each game', () => { const games=[{game_id:'1',date:'2026-01-01',home:'A',away:'B',home_score:1,away_score:0,status:'FINAL'},{game_id:'2',date:'2026-01-02',home:'A',away:'B',home_score:0,away_score:1,status:'FINAL'}]; const t=buildEloTimeline(games); assert.equal(t.rows.length,2); assert.equal(t.rows[0].home_elo_before,1500); assert.equal(t.rows[1].home_elo_before,t.rows[0].home_elo_after); });

test('Elo snapshot reproduces ratings after a cutoff date', () => { const games=[{game_id:'1',date:'2026-01-01',home:'A',away:'B',home_score:1,away_score:0,status:'FINAL'},{game_id:'2',date:'2026-01-03',home:'A',away:'B',home_score:0,away_score:1,status:'FINAL'}]; const t=buildEloTimeline(games); const s=eloSnapshotAtDate(t,'2026-01-01'); assert.equal(s.games_processed,1); assert.equal(s.ratings.A,t.rows[0].home_elo_after); });
