import { collectLiveSeason } from './live-ingest.js';

const season = Number(process.argv[2] ?? new Date().getFullYear());
const asOfDate = process.argv[3] ?? null;
const months = (process.argv[4] ?? '3,4,5,6,7,8').split(',').filter(Boolean).map(Number);
const outDir = process.argv[5] ?? `data/raw/${season}`;

console.log(JSON.stringify({ event:'START', season, as_of_date:asOfDate, months, out_dir:outDir }));
const result = await collectLiveSeason({
  season,
  months,
  outDir,
  asOfDate,
  onProgress: event => console.log(JSON.stringify({ event:'CHECKPOINT', ...event }))
});
console.log(JSON.stringify({ event:'DONE', manifest:result.manifestFile, games:result.games.length, audit:result.manifest.audit }, null, 2));
