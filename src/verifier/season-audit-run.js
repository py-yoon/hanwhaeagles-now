import fs from 'node:fs';
import { auditSeasonGames } from '../collector/season-audit.js';
const f = JSON.parse(fs.readFileSync('data/fixtures/season-2026-early-april.json','utf8'));
const result = auditSeasonGames(f.games,{teams:f.initial_standings.map(x=>x.team)});
console.log(JSON.stringify(result,null,2));
