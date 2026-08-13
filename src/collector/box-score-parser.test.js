import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseHitterEntry, parsePitcherEntry, parseBoxScoreResponse } from './box-score-parser.js';

const FIXTURE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'fixtures', 'box-score-20260801LGOB0.json');
const RAW = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));

test('parseHitterEntry pairs lineup info with AB/H/RBI/R, ignoring the season-cumulative AVG column', () => {
  const rows = parseHitterEntry(RAW.arrHitter[0]); // away = LG
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], { player_name: '홍창기', position: '우', AB: 5, H: 2, RBI: 1, R: 0 });
  assert.deepEqual(rows[2], { player_name: '오스틴', position: '一', AB: 4, H: 0, RBI: 0, R: 0 });
});

test('parsePitcherEntry reads this-game box counts and derives W/L/SV from 결과, not the season W/L/SV columns', () => {
  const rows = parsePitcherEntry(RAW.arrPitcher[0]); // away = LG
  assert.equal(rows.length, 2);
  const starter = rows[0];
  assert.equal(starter.player_name, '카라스코');
  assert.equal(starter.IP, 7);
  assert.equal(starter.SO, 2);
  assert.equal(starter.W, 0);
  assert.equal(starter.L, 0);
  // 우강훈's row has season L=1 in column 5, but no decision (결과 is blank) this game.
  const reliever = rows[1];
  assert.equal(reliever.IP, 2 / 3);
  assert.equal(reliever.L, 0);
});

test('parsePitcherEntry marks a no-decision (무) result without flipping W or L', () => {
  const rows = parsePitcherEntry(RAW.arrPitcher[1]); // home = DOOSAN
  const noDecision = rows.find((r) => r.player_name === '박치국');
  assert.ok(noDecision);
  assert.equal(noDecision.W, 0);
  assert.equal(noDecision.L, 0);
  assert.equal(noDecision.SV, 0);
});

test('parseBoxScoreResponse tags every row with the correct team (away=LG, home=DOOSAN) and game_id/as_of', () => {
  const parsed = parseBoxScoreResponse(RAW, { gameId: '20260801LGOB0', asOf: '2026-08-01', homeTeam: '두산', awayTeam: 'LG' });
  assert.equal(parsed.away_team, 'LG');
  assert.equal(parsed.home_team, 'DOOSAN');
  assert.equal(parsed.game_id, '20260801LGOB0');
  assert.equal(parsed.as_of, '2026-08-01');

  const hongChangGi = parsed.battingRows.find((r) => r.player_id === 'LG-홍창기');
  assert.ok(hongChangGi);
  assert.equal(hongChangGi.team, 'LG');
  assert.equal(hongChangGi.AB, 5);
  assert.equal(hongChangGi.H, 2);
  // Fields the box score can't provide are explicit zeros, not missing/undefined.
  assert.equal(hongChangGi.HR, 0);
  assert.equal(hongChangGi.BB, 0);

  const gwakBin = parsed.pitchingRows.find((r) => r.player_id === 'DOOSAN-곽빈');
  assert.ok(gwakBin);
  assert.equal(gwakBin.team, 'DOOSAN');
  assert.equal(gwakBin.IP, 6);
  assert.equal(gwakBin.ER, 2);
  assert.equal(gwakBin.SO, 10);
});

test('parseBoxScoreResponse output rows are accepted by normalizePlayerStatRow without throwing', async () => {
  const { normalizePlayerStatRow } = await import('../model/player-features.js');
  const parsed = parseBoxScoreResponse(RAW, { gameId: '20260801LGOB0', asOf: '2026-08-01', homeTeam: '두산', awayTeam: 'LG' });
  for (const row of [...parsed.battingRows, ...parsed.pitchingRows]) {
    const normalized = normalizePlayerStatRow(row);
    assert.equal(normalized.team, row.team);
    assert.equal(normalized.as_of, '2026-08-01');
  }
});

test('parseBoxScoreResponse throws instead of guessing when game/team identity is missing', () => {
  // GetBoxScoreScroll's own JSON has no G_ID/HOME_NM/AWAY_NM (unlike the sibling
  // GetScoreBoardScroll endpoint) — the caller must supply them, or this must fail loudly
  // rather than silently produce rows tagged with the wrong team.
  assert.throws(() => parseBoxScoreResponse(RAW, { gameId: '20260801LGOB0', asOf: '2026-08-01', homeTeam: '두산' }));
  assert.throws(() => parseBoxScoreResponse(RAW, { asOf: '2026-08-01', homeTeam: '두산', awayTeam: 'LG' }));
});
