import fs from 'node:fs/promises';
import { collectTeamStats } from './team-stats.js';

const date = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const out = process.argv[3] ?? `data/raw/team-stats-${date}.json`;

const stats = await collectTeamStats({});
await fs.writeFile(out, JSON.stringify({ as_of: date, source: 'KBO Team Hitter/Pitcher Basic (live, season-to-date cumulative)', teams: stats }, null, 2));
console.log(`Collected team batting/pitching stats as of ${date} -> ${out}`);
