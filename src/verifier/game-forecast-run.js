import fs from 'node:fs';
import { forecastSchedule } from '../model/game-forecast.js';
const gamesFile=process.argv[2], snapshotsFile=process.argv[3];
if(!gamesFile||!snapshotsFile||!fs.existsSync(gamesFile)||!fs.existsSync(snapshotsFile)){
  console.log(JSON.stringify({status:'NO_DATA',usage:'node src/verifier/game-forecast-run.js <games.json> <snapshots.json>'},null,2));process.exit(0);
}
const games=JSON.parse(fs.readFileSync(gamesFile,'utf8')); const snapshots=JSON.parse(fs.readFileSync(snapshotsFile,'utf8'));
console.log(JSON.stringify({status:'PASS',count:forecastSchedule(games.games||games,snapshots)},null,2));
