import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEloTimeline, eloSnapshotAtDate } from './elo.js';
import { buildTeamSnapshot, snapshotHealth } from './team-snapshot.js';
import fs from 'node:fs';

const f = JSON.parse(fs.readFileSync('data/fixtures/season-2026-early-april.json','utf8'));
const official = JSON.parse(fs.readFileSync('data/fixtures/official-2026-04-05.json','utf8')).official_standings;

test('builds ten-team snapshot with Elo and official rank', () => {
  const timeline = buildEloTimeline(f.games,{teams:f.initial_standings.map(x=>x.team)});
  const snap = eloSnapshotAtDate(timeline,'2026-04-05');
  const out = buildTeamSnapshot({ratings:snap.ratings, officialStandings:official, date:snap.date, gamesProcessed:snap.games_processed});
  assert.equal(out.rows.length,10);
  assert.equal(snapshotHealth(out).status,'PASS');
  assert.ok(out.rows.every(x => Number.isFinite(x.elo)));
});

test('rank gap is official rank minus Elo rank', () => {
  const out = buildTeamSnapshot({ratings:{A:1600,B:1500,C:1400}, officialStandings:[{rank:1,team:'B',games:1,wins:1,losses:0,draws:0},{rank:2,team:'A',games:1,wins:1,losses:0,draws:0},{rank:3,team:'C',games:1,wins:0,losses:1,draws:0}], date:'2026-01-01', gamesProcessed:1});
  assert.equal(out.rows.find(x=>x.team==='A').elo_rank,1);
  assert.equal(out.rows.find(x=>x.team==='A').rank_gap,1);
});
