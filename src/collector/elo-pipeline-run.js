import { runEloSnapshotPipeline } from './elo-pipeline.js';

const manifestFile = process.argv[2] ?? `data/raw/2026/season-manifest.json`;
const asOfDate = process.argv[3] ?? null;
const outFile = process.argv[4] ?? `data/derived/elo-snapshot-${asOfDate ?? 'current'}.json`;
const teams = ['LG','HANWHA','SSG','SAMSUNG','NC','KT','LOTTE','KIA','DOOSAN','KIWOOM'];
const output = await runEloSnapshotPipeline({ manifestFile, outFile, asOfDate, teams, eloOptions: { kFactor: 40, homeAdvantage: 0 } });
console.log(JSON.stringify({ event:'DONE', outFile, snapshot:output.snapshot }, null, 2));
