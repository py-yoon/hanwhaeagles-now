import fs from 'node:fs';
import { buildEloTimeline, eloSnapshotAtDate } from '../engine/elo.js';
const f=JSON.parse(fs.readFileSync('data/fixtures/season-2026-early-april.json','utf8'));
const timeline=buildEloTimeline(f.games,{teams:f.initial_standings.map(x=>x.team)});
const dates=['2026-04-05','2026-04-10'];
console.log(JSON.stringify({games:timeline.rows.length,snapshots:dates.map(date=>eloSnapshotAtDate(timeline,date))},null,2));
