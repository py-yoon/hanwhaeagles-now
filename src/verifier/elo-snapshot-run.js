import fs from 'node:fs';
import { buildEloTimeline, eloSnapshotAtDate } from '../engine/elo.js';
import { buildTeamSnapshot, snapshotHealth } from '../engine/team-snapshot.js';
const games = JSON.parse(fs.readFileSync('data/fixtures/season-2026-early-april.json','utf8'));
const official = JSON.parse(fs.readFileSync('data/fixtures/official-2026-07-26.json','utf8'));
const timeline = buildEloTimeline(games.games,{teams:official.official_standings.map(x=>x.team)});
const snap = eloSnapshotAtDate(timeline,'2026-07-26');
const out = buildTeamSnapshot({ratings:snap.ratings, officialStandings:official.official_standings, date:snap.date, gamesProcessed:snap.games_processed});
console.log(JSON.stringify({snapshot:out,health:snapshotHealth(out)},null,2));
