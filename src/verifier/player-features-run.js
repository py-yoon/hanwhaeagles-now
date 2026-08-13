import fs from 'node:fs';
import { aggregateTeamPlayerStats, teamFeatureVector } from '../model/player-features.js';
const file=process.argv[2] ?? 'data/fixtures/player-stats-2026.json';
if(!fs.existsSync(file)){ console.log(JSON.stringify({status:'NO_DATA',file},null,2)); process.exit(0); }
const rows=JSON.parse(fs.readFileSync(file,'utf8'));
const stats=aggregateTeamPlayerStats(rows,{asOf:process.argv[3] ?? '2026-08-11'});
const features=Object.fromEntries(Object.entries(stats).map(([t,s])=>[t,teamFeatureVector(s)]));
console.log(JSON.stringify({version:'0.7.0',teams:Object.keys(stats).length,features},null,2));
