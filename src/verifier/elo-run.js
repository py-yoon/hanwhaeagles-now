import fs from 'node:fs';
import { walkForwardBacktest } from '../engine/elo.js';
const f=JSON.parse(fs.readFileSync('data/fixtures/season-2026-early-april.json','utf8'));
const r=walkForwardBacktest(f.games,{teams:f.initial_standings.map(x=>x.team)});
console.log(JSON.stringify({games:r.games,accuracy:Number(r.accuracy.toFixed(4)),log_loss:Number(r.log_loss.toFixed(4)),brier_score:Number(r.brier_score.toFixed(4)),final_ratings:Object.fromEntries(Object.entries(r.final_ratings).sort((a,b)=>b[1]-a[1]))},null,2));
