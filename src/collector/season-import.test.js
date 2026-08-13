import test from 'node:test';
import assert from 'node:assert/strict';
import { auditCheckpointChain, collectSeasonCheckpoints } from './season-import.js';

const game = (id, date, home, away, hs, as) => ({ game_id:id, date, home, away, home_score:hs, away_score:as, status:'FINAL' });

test('checkpoint chain audits clean monthly segments', () => {
  const result = auditCheckpointChain([
    { month: 3, games: [game('a','2026-03-28','HANWHA','KIWOOM',10,9)] },
    { month: 4, games: [game('b','2026-04-01','LG','HANWHA',3,2)] },
  ]);
  assert.equal(result.coverage.errors.length, 0);
  assert.equal(result.seasonAudit.errors.length, 0);
  assert.equal(result.games.length, 2);
});

test('checkpoint chain catches duplicate ids across months', () => {
  const result = auditCheckpointChain([
    { month: 3, games: [game('dup','2026-03-28','HANWHA','KIWOOM',10,9)] },
    { month: 4, games: [game('dup','2026-04-01','LG','HANWHA',3,2)] },
  ]);
  assert.ok(result.coverage.errors.some((x) => x.type === 'CROSS_CHECKPOINT_DUPLICATE'));
});

test('monthly collector writes one checkpoint per month', async () => {
  const outDir = `/tmp/hanwha-now-season-import-test-${Date.now()}`;
  const result = await collectSeasonCheckpoints({
    season: 2026,
    months: [3,4],
    outDir,
    collect: async ({ month }) => [game(`g${month}`, `2026-0${month}-28`, 'HANWHA', 'KIWOOM', 1, 0)],
  });
  assert.equal(result.length, 2);
  assert.equal(result[0].games, 1);
  assert.equal(result[1].games, 1);
});
