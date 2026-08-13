import fs from 'node:fs';
import { verifySnapshots } from './season.js';
const file=process.argv[2]??'data/fixtures/season-2026-early-april.json';
const f=JSON.parse(fs.readFileSync(file,'utf8'));
const result=verifySnapshots({initialStandings:f.initial_standings,games:f.games,snapshots:f.snapshots});
console.log(JSON.stringify(result,null,2));
process.exitCode=result.status==='PASS'?0:1;
