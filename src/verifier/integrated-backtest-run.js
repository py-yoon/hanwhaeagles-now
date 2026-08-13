import fs from 'node:fs';
import {evaluateIntegratedBacktest} from '../model/integrated-backtest.js';
const file=process.argv[2]||'data/fixtures/season-2026-early-april.json';
if(!fs.existsSync(file)){console.log(JSON.stringify({status:'NO_DATA',file},null,2));process.exit(0)}
const raw=JSON.parse(fs.readFileSync(file,'utf8')); const games=Array.isArray(raw)?raw:raw.games;
const report=evaluateIntegratedBacktest(games,{trainFraction:.7});
console.log(JSON.stringify({status:'PASS',source:file,...report},null,2));
