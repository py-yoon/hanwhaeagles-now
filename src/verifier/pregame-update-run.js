import fs from 'node:fs';
import {updatePregameForecast} from '../model/pregame-update.js';
const [gameFile,snapshotFile,eventsFile,asOf]=process.argv.slice(2);
if(!gameFile||!snapshotFile||!eventsFile){
  console.log(JSON.stringify({status:'NO_DATA',usage:'node src/verifier/pregame-update-run.js <game.json> <snapshots.json> <starter-events.json> [asOf]'},null,2));
  process.exit(0);
}
for(const f of [gameFile,snapshotFile,eventsFile]) if(!fs.existsSync(f)) throw new Error(`missing file: ${f}`);
const game=JSON.parse(fs.readFileSync(gameFile,'utf8'));
const snapshots=JSON.parse(fs.readFileSync(snapshotFile,'utf8'));
const events=JSON.parse(fs.readFileSync(eventsFile,'utf8'));
console.log(JSON.stringify(updatePregameForecast(game,snapshots,events.events??events,{asOf:asOf??game.date}),null,2));
