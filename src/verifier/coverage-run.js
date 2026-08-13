import fs from 'node:fs/promises';
import { auditCheckpointCoverage } from '../collector/coverage-checkpoints.js';
const file = process.argv[2] ?? 'data/raw/2026-regular-games.json';
try {
  const raw = JSON.parse(await fs.readFile(file, 'utf8'));
  const result = auditCheckpointCoverage(raw.games ?? []);
  console.log(JSON.stringify(result, null, 2));
  if (result.status === 'FAIL') process.exitCode = 1;
} catch (err) {
  console.error(`Unable to audit coverage file: ${file}`);
  console.error(err.message);
  process.exitCode = 1;
}
