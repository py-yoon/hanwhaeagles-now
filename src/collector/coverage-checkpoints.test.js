import test from 'node:test';
import assert from 'node:assert/strict';
import { auditCheckpointCoverage } from './coverage-checkpoints.js';

test('checkpoint audit detects cross-checkpoint duplicate ids', () => {
  const games = [
    { game_id: 'A', date: '2026-03-28', status: 'FINAL' },
    { game_id: 'A', date: '2026-04-07', status: 'FINAL' },
  ];
  const result = auditCheckpointCoverage(games);
  assert.equal(result.status, 'FAIL');
  assert.equal(result.errors[0].type, 'CROSS_CHECKPOINT_DUPLICATE');
});

test('checkpoint audit accepts clean segmented data', () => {
  const games = [
    { game_id: 'A', date: '2026-03-28', status: 'FINAL' },
    { game_id: 'B', date: '2026-04-07', status: 'FINAL' },
    { game_id: 'C', date: '2026-05-01', status: 'FINAL' },
  ];
  const result = auditCheckpointCoverage(games);
  assert.equal(result.status, 'PASS');
  assert.equal(result.checkpoints.find(x => x.id === 'opening').games, 1);
  assert.equal(result.checkpoints.find(x => x.id === 'early-april').games, 1);
});
