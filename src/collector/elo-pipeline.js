import fs from 'node:fs/promises';
import path from 'node:path';
import { buildEloTimeline, eloSnapshotAtDate } from '../engine/elo.js';
import { normalizeGameStatus } from './live-ingest.js';

export async function loadSeasonManifest(manifestFile) {
  const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8'));
  if (!manifest || !Array.isArray(manifest.checkpoints)) throw new Error('Invalid season manifest');
  return manifest;
}

export async function loadCheckpointGames(checkpoints) {
  const all = [];
  for (const cp of checkpoints) {
    const payload = JSON.parse(await fs.readFile(cp.file, 'utf8'));
    for (const game of payload.games ?? []) all.push({ ...game, status: normalizeGameStatus(game) });
  }
  const byId = new Map();
  for (const game of all) {
    if (byId.has(game.game_id)) throw new Error(`Duplicate game_id in checkpoints: ${game.game_id}`);
    byId.set(game.game_id, game);
  }
  return [...byId.values()].sort((a,b) => a.date.localeCompare(b.date) || a.game_id.localeCompare(b.game_id));
}

export function buildCurrentEloSnapshot(games, { asOfDate, teams, eloOptions = {} } = {}) {
  const finalGames = games
    .filter(g => g.date <= asOfDate && normalizeGameStatus(g) === 'FINAL')
    .sort((a,b) => a.date.localeCompare(b.date) || a.game_id.localeCompare(b.game_id));
  const timeline = buildEloTimeline(finalGames, { ...eloOptions, teams });
  const snapshot = eloSnapshotAtDate(timeline, asOfDate);
  const ratings = teams.map(team => ({ team, elo: snapshot.ratings[team] ?? (eloOptions.initialRating ?? 1500) }))
    .sort((a,b) => b.elo - a.elo || a.team.localeCompare(b.team))
    .map((row, i) => ({ ...row, elo_rank: i + 1 }));
  return { as_of_date: asOfDate, games_processed: snapshot.games_processed, ratings, timeline_rows: timeline.rows.length };
}

export async function runEloSnapshotPipeline({ manifestFile, outFile, asOfDate, teams, eloOptions = {} }) {
  const manifest = await loadSeasonManifest(manifestFile);
  const games = await loadCheckpointGames(manifest.checkpoints);
  const snapshot = buildCurrentEloSnapshot(games, { asOfDate: asOfDate ?? manifest.as_of_date ?? new Date().toISOString().slice(0,10), teams, eloOptions });
  const output = { version: '0.6.4', source_manifest: manifestFile, snapshot, provenance: { source_as_of: manifest.as_of_date ?? null, source_games: games.length } };
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, JSON.stringify(output, null, 2));
  return output;
}
