import fs from 'node:fs/promises';
import path from 'node:path';
import { auditSeasonGames } from './season-audit.js';
import { auditCheckpointCoverage } from './coverage-checkpoints.js';

export const DEFAULT_MONTHS = [3,4,5,6,7,8];

export async function collectSeasonCheckpoints({
  season,
  months = DEFAULT_MONTHS,
  outDir = `data/raw/${season}`,
  collectorOptions = {},
  collect,
}) {
  const checkpoints = [];
  for (const month of months) {
    const games = await collect({ season, month, ...collectorOptions });
    const checkpoint = {
      season,
      month,
      collected_at: new Date().toISOString(),
      games,
    };
    const file = path.join(outDir, `${season}-${String(month).padStart(2,'0')}.json`);
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(file, JSON.stringify(checkpoint, null, 2));
    checkpoints.push({ month, file, games: games.length });
  }
  return checkpoints;
}

export async function mergeCheckpointFiles(files) {
  const rows = [];
  for (const file of files) {
    const payload = JSON.parse(await fs.readFile(file, 'utf8'));
    rows.push({ checkpoint: payload.month, games: payload.games ?? [] });
  }
  return rows;
}

export function auditCheckpointChain(checkpoints) {
  const games = checkpoints.flatMap((c) => c.games ?? []);
  const coverage = auditCheckpointCoverage(games);
  const seasonAudit = auditSeasonGames(games);
  return { coverage, seasonAudit, games };
}
