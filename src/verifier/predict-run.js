import fs from 'node:fs';
import {predictIntegrated,buildStrengthParts} from '../model/integrated-prediction.js';
const file=process.argv[2];
if(!file || !fs.existsSync(file)){console.log(JSON.stringify({status:'NO_DATA',usage:'node src/verifier/predict-run.js <fixture.json>'},null,2));process.exit(0)}
const x=JSON.parse(fs.readFileSync(file,'utf8'));
const h=buildStrengthParts(x.home||{}), a=buildStrengthParts(x.away||{});
console.log(JSON.stringify(predictIntegrated(h,a),null,2));
