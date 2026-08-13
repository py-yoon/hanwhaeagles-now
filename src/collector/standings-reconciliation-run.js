import fs from 'node:fs/promises';
import { reconcileOfficialTimeline } from './standings-reconciliation.js';

const gamesFile = process.argv[2] ?? 'data/fixtures/season-2026-early-april.json';
const snapshotFiles = process.argv.slice(3);
if (!snapshotFiles.length) snapshotFiles.push('data/fixtures/official-2026-04-05.json');

const gamePayload = JSON.parse(await fs.readFile(gamesFile, 'utf8'));
const snapshots = [];
for (const file of snapshotFiles) {
  const payload = JSON.parse(await fs.readFile(file, 'utf8'));
  snapshots.push(payload);
}
const result = reconcileOfficialTimeline({ games: gamePayload.games ?? [], snapshots });
console.log(JSON.stringify(result, null, 2));
if (result.status !== 'PASS') process.exitCode = 1;
