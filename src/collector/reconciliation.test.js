import test from 'node:test';
import assert from 'node:assert/strict';
import { gameFingerprint, reconcileGameSources } from './reconciliation.js';

const g = (id, score=4, status='FINAL') => ({game_id:id,date:'2026-08-12',time:'18:30',away:'DOOSAN',home:'HANWHA',away_score:2,home_score:score,status});

test('fingerprint is independent of game_id', () => {
  assert.equal(gameFingerprint(g('a')), gameFingerprint(g('different')));
});

test('reconciles equivalent sources even with different ids', () => {
  const r = reconcileGameSources([g('a')], [g('b')]);
  assert.equal(r.status, 'PASS');
  assert.equal(r.matched, 1);
});

test('detects score conflicts', () => {
  const r = reconcileGameSources([g('a',4)], [g('b',5)]);
  assert.equal(r.status, 'FAIL');
  assert.equal(r.conflicts[0].reason, 'SCORE_CONFLICT');
});

test('detects missing games on either source', () => {
  const r = reconcileGameSources([g('a')], [g('b'), {...g('c'), date:'2026-08-13'}]);
  assert.equal(r.status, 'FAIL');
  assert.equal(r.only_secondary.length, 1);
});
