import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCurrentEloSnapshot, loadCheckpointGames } from './elo-pipeline.js';

test('current Elo snapshot excludes future and non-final games', () => {
  const games = [
    { game_id:'A', date:'2026-04-01', home:'HANWHA', away:'DOOSAN', home_score:3, away_score:1, status:'FINAL' },
    { game_id:'B', date:'2026-04-02', home:'HANWHA', away:'DOOSAN', home_score:0, away_score:4, status:'FINAL' },
    { game_id:'C', date:'2026-04-03', home:'HANWHA', away:'DOOSAN', status:'SCHEDULED' },
    { game_id:'D', date:'2026-04-04', home:'HANWHA', away:'DOOSAN', home_score:9, away_score:9, status:'LIVE' },
  ];
  const out = buildCurrentEloSnapshot(games, { asOfDate:'2026-04-04', teams:['HANWHA','DOOSAN'] });
  assert.equal(out.games_processed, 2);
  assert.equal(out.ratings.length, 2);
});

test('snapshot is deterministic', () => {
  const games = [{ game_id:'A', date:'2026-04-01', home:'HANWHA', away:'DOOSAN', home_score:3, away_score:1, status:'FINAL' }];
  const a = buildCurrentEloSnapshot(games, { asOfDate:'2026-04-02', teams:['HANWHA','DOOSAN'] });
  const b = buildCurrentEloSnapshot(games, { asOfDate:'2026-04-02', teams:['HANWHA','DOOSAN'] });
  assert.deepEqual(a, b);
});
