import test from 'node:test';
import assert from 'node:assert/strict';
import { auditLiveDataset, dedupeGames, filterAsOf, normalizeGameStatus, collectLiveSeason } from './live-ingest.js';

const game = (id, date, status='FINAL', hs=1, as=0) => ({ game_id:id, date, home:'HANWHA', away:'DOOSAN', home_score:hs, away_score:as, status });

test('normalizes finished and score-complete rows to FINAL', () => {
  assert.equal(normalizeGameStatus(game('a','2026-04-01','FINISHED')), 'FINAL');
  assert.equal(normalizeGameStatus(game('b','2026-04-01','SCHEDULED',null,null)), 'SCHEDULED');
});

test('dedupes game ids without hiding the duplicate', () => {
  const r = dedupeGames([game('a','2026-04-01'), game('a','2026-04-01'), game('b','2026-04-02')]);
  assert.equal(r.games.length, 2);
  assert.equal(r.duplicates.length, 1);
});

test('filters a final dataset at an as-of cutoff', () => {
  const r = filterAsOf([game('a','2026-04-01'), game('b','2026-04-02'), game('c','2026-04-03','SCHEDULED',null,null)], '2026-04-02');
  assert.deepEqual(r.map(x=>x.game_id), ['a','b']);
});

test('live audit catches future finals beyond cutoff', () => {
  const r = auditLiveDataset([game('a','2026-04-01'), game('b','2026-04-03')], { teams:['HANWHA','DOOSAN'], asOfDate:'2026-04-02' });
  assert.equal(r.status, 'FAIL');
  assert.ok(r.errors.some(x=>x.reason === 'AFTER_AS_OF_DATE'));
});

test('live season collector writes audited checkpoints and manifest', async () => {
  const outDir = `/tmp/hanwha-now-live-${Date.now()}`;
  const result = await collectLiveSeason({
    season: 2026,
    months: [3,4],
    outDir,
    asOfDate: '2026-04-02',
    collect: async ({month}) => month === 3
      ? [game('a','2026-03-28')]
      : [game('b','2026-04-01')]
  });
  assert.equal(result.checkpoints.length, 2);
  assert.equal(result.games.length, 2);
  assert.equal(result.manifest.audit.status, 'PASS');
});
test('as-of pipeline ignores future scheduled games but retains their checkpoint metadata',()=>{
  const games=[game('a','2026-08-11','FINAL',3,6),game('b','2026-08-12','SCHEDULED',null,null)];
  const r=filterAsOf(games,'2026-08-11');
  assert.deepEqual(r.map(x=>x.game_id),['a']);
});
