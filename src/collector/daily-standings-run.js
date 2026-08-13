import fs from 'node:fs/promises';
import { collectDailyStandings } from './daily-standings.js';

const date = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const out = process.argv[3] ?? `data/raw/official-${date}.json`;

const rows = await collectDailyStandings({ date });
const official_standings = rows.map((r) => ({
  rank: r.rank, team: r.team, games: r.games, wins: r.wins, losses: r.losses,
  draws: r.draws, win_rate: r.win_rate, games_behind: r.games_behind,
}));
const payload = { date, source: 'KBO TeamRankDaily (live)', official_standings };
await fs.writeFile(out, JSON.stringify(payload, null, 2));
console.log(`Collected official standings for ${date} -> ${out}`);
