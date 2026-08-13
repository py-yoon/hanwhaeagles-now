import fs from 'node:fs';
import { evaluateEloGrid } from '../engine/elo-grid.js';
const f=JSON.parse(fs.readFileSync('data/fixtures/season-2026-early-april.json','utf8'));
const r=evaluateEloGrid(f.games,{teams:f.initial_standings.map(x=>x.team)});
console.log(JSON.stringify({models:r.results.length,best_by_log_loss:r.best_by_log_loss,best_by_brier:r.best_by_brier},null,2));
