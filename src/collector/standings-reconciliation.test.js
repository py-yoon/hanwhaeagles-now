import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { calculateStandingsFromGames, reconcileOfficialStandings, reconcileOfficialTimeline } from './standings-reconciliation.js';

const games = JSON.parse(fs.readFileSync('data/fixtures/season-2026-early-april.json', 'utf8')).games;
const official = JSON.parse(fs.readFileSync('data/fixtures/official-2026-04-05.json', 'utf8')).official_standings;

 test('reconstructs 2026-04-05 standings from final games', () => {
  const result = reconcileOfficialStandings({ games, official, asOfDate: '2026-04-05' });
  assert.equal(result.status, 'PASS');
  assert.equal(result.games_processed, 40);
  assert.equal(result.official_games, 40);
 });

test('ignores future games in as-of reconstruction', () => {
  const result = calculateStandingsFromGames([
    ...games,
    { game_id:'future', date:'2026-04-06', away:'HANWHA', home:'DOOSAN', away_score:99, home_score:0, status:'FINAL' }
  ], { asOfDate:'2026-04-05' });
  assert.equal(result.games_processed, 40);
  assert.equal(result.standings.find(x => x.team === 'HANWHA').wins, 4);
});

test('detects missing final game through official game count', () => {
  const result = reconcileOfficialStandings({ games: games.slice(1), official, asOfDate:'2026-04-05' });
  assert.equal(result.status, 'FAIL');
  assert.ok(result.mismatches.some(x => x.reason === 'GAME_COUNT_MISMATCH'));
});

test('detects score/result mismatch through standings', () => {
  const altered = games.map((g, i) => i === 0 ? {...g, home_score: g.away_score + 20} : g);
  const result = reconcileOfficialStandings({ games: altered, official, asOfDate:'2026-04-05' });
  assert.equal(result.status, 'FAIL');
  assert.ok(result.mismatches.some(x => /MISMATCH$/.test(x.reason)));
});

test('timeline reconciliation reports all snapshots', () => {
  const result = reconcileOfficialTimeline({ games, snapshots:[{date:'2026-04-05', official_standings:official}] });
  assert.equal(result.status, 'PASS');
  assert.equal(result.snapshots_checked, 1);
  assert.equal(result.failures.length, 0);
});
