import fs from 'node:fs';
const file=process.argv[2]??'reports/hanwha-now-report.json';
if(!fs.existsSync(file)) throw new Error(`missing report: ${file}`);
const r=JSON.parse(fs.readFileSync(file,'utf8'));
if(r.provenance?.source_status!=='live') throw new Error('production gate blocked: source_status is not live');
if(!Array.isArray(r.rank_distribution)||!Number.isFinite(r.summary?.playoff_probability)) throw new Error('production gate blocked: invalid report');
console.log('PRODUCTION_GATE=PASS');
