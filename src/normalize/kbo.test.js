import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTeamName } from './kbo.js';

const CANONICAL = ['HANWHA', 'DOOSAN', 'SAMSUNG', 'LG', 'KT', 'KIA', 'NC', 'LOTTE', 'SSG', 'KIWOOM'];

test('normalizeTeamName is idempotent for every canonical team code', () => {
  // Regression: LOTTE/KIWOOM only had Korean-name aliases (롯데/키움), not a self-mapping, so
  // re-normalizing an already-canonical code (as box-score.js does, since it receives
  // already-normalized home/away from the schedule collector) threw "Unknown KBO team".
  for (const team of CANONICAL) assert.equal(normalizeTeamName(team), team);
});

test('normalizeTeamName rejects an unknown team rather than guessing', () => {
  assert.throws(() => normalizeTeamName('WHATEVER'));
});
