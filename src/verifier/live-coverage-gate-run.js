import fs from 'node:fs/promises';
import { validateLiveCoverage } from './live-coverage-gate.js';

const gamesFile = process.argv[2];
const standingsFile = process.argv[3];
const asOfDate = process.argv[4] ?? new Date().toISOString().slice(0,10);
if (!gamesFile || !standingsFile) throw new Error('usage: npm run coverage:live -- <games.json> <standings.json> <YYYY-MM-DD>');
const games = JSON.parse(await fs.readFile(gamesFile,'utf8'));
const standings = JSON.parse(await fs.readFile(standingsFile,'utf8'));
const result = validateLiveCoverage({ games, standings, asOfDate });
console.log(JSON.stringify({version:'0.9.1',...result},null,2));
if(result.status!=='PASS') process.exitCode=2;
