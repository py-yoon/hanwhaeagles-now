import fs from 'node:fs/promises';
import path from 'node:path';
import { auditSeasonGames } from './season-audit.js';
import { auditCheckpointCoverage } from './coverage-checkpoints.js';

export const KBO_TEAMS = ['LG','HANWHA','SSG','SAMSUNG','NC','KT','LOTTE','KIA','DOOSAN','KIWOOM'];

const FINAL = new Set(['FINAL','FINISHED']);
const FUTURE = new Set(['SCHEDULED','POSTPONED','RESCHEDULED']);

export function normalizeGameStatus(game) {
  if (FINAL.has(game.status)) return 'FINAL';
  if (FUTURE.has(game.status)) return game.status;
  if (game.status === 'CANCELLED') return 'CANCELLED';
  if (Number.isInteger(game.home_score) && Number.isInteger(game.away_score)) return 'FINAL';
  return game.status ?? 'UNKNOWN';
}

export function filterAsOf(games, asOfDate, { includeFuture = false } = {}) {
  return games
    .filter(g => !asOfDate || g.date <= asOfDate || includeFuture)
    .map(g => ({ ...g, status: normalizeGameStatus(g) }))
    .filter(g => includeFuture || FINAL.has(g.status));
}

export function dedupeGames(games) {
  const byId = new Map();
  const duplicates = [];
  for (const game of games) {
    const previous = byId.get(game.game_id);
    if (previous) {
      duplicates.push({ game_id: game.game_id, previous_date: previous.date, duplicate_date: game.date });
      continue;
    }
    byId.set(game.game_id, game);
  }
  return { games: [...byId.values()].sort((a,b) => a.date.localeCompare(b.date) || a.game_id.localeCompare(b.game_id)), duplicates };
}

export function buildProvenance({ season, months, games, source = 'KBO Schedule/Schedule.aspx', collectedAt = new Date().toISOString() }) {
  const dates = games.map(g => g.date).sort();
  return {
    season,
    source,
    collected_at: collectedAt,
    requested_months: months,
    games: games.length,
    final_games: games.filter(g => normalizeGameStatus(g) === 'FINAL').length,
    future_games: games.filter(g => FUTURE.has(normalizeGameStatus(g))).length,
    cancelled_games: games.filter(g => normalizeGameStatus(g) === 'CANCELLED').length,
    date_range: dates.length ? { from: dates[0], to: dates.at(-1) } : null
  };
}

export function auditLiveDataset(games, { teams = KBO_TEAMS, asOfDate = null } = {}) {
  const normalized = games.map(g => ({ ...g, status: normalizeGameStatus(g) }));
  const { games: uniqueGames, duplicates } = dedupeGames(normalized);
  const seasonAudit = auditSeasonGames(uniqueGames, { teams, allowFuture: true });
  const coverage = auditCheckpointCoverage(uniqueGames);
  const cutoffViolations = asOfDate ? uniqueGames.filter(g => g.date > asOfDate && normalizeGameStatus(g) === 'FINAL') : [];
  const invalidFinals = uniqueGames.filter(g => normalizeGameStatus(g) === 'FINAL' && (!Number.isInteger(g.home_score) || !Number.isInteger(g.away_score)));
  const errors = [
    ...duplicates.map(x => ({ reason: 'DUPLICATE_GAME_ID', ...x })),
    ...seasonAudit.errors,
    ...cutoffViolations.map(g => ({ reason: 'AFTER_AS_OF_DATE', game_id: g.game_id, date: g.date })),
    ...invalidFinals.map(g => ({ reason: 'INVALID_FINAL_SCORE', game_id: g.game_id }))
  ];
  return {
    status: errors.length ? 'FAIL' : 'PASS',
    games: uniqueGames.length,
    final_games: uniqueGames.filter(g => normalizeGameStatus(g) === 'FINAL').length,
    errors,
    warnings: seasonAudit.warnings,
    date_range: seasonAudit.date_range,
    active_dates: seasonAudit.active_dates,
    coverage
  };
}

export async function collectLiveSeason({
  season,
  months = [3,4,5,6,7,8],
  outDir = `data/raw/${season}`,
  asOfDate = null,
  collect = null,
  retries = 2,
  collectorOptions = {},
  onProgress = () => {}
} = {}) {
  const checkpointResults = [];
  const all = [];
  const collector = collect ?? (async (args) => {
    const { collectMonth } = await import('./kbo.js');
    return collectMonth(args);
  });
  for (const month of months) {
    let games;
    let lastError;
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        games = await collector({ season, month, ...collectorOptions });
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        onProgress({ season, month, attempt, status: 'RETRY', error: error.message });
      }
    }
    if (lastError) throw lastError;
    const normalized = games.map(g => ({ ...g, status: normalizeGameStatus(g) }));
    const filtered = asOfDate ? normalized.filter(g => g.date <= asOfDate) : normalized;
    const audit = auditLiveDataset(filtered, { teams: KBO_TEAMS, asOfDate });
    if (audit.status === 'FAIL') throw new Error(`Month ${month} audit failed: ${JSON.stringify(audit.errors.slice(0, 10))}`);
    const file = path.join(outDir, `${season}-${String(month).padStart(2,'0')}.json`);
    const payload = {
      season, month, as_of_date: asOfDate,
      provenance: buildProvenance({ season, months: [month], games: filtered }),
      audit,
      games: filtered
    };
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(file, JSON.stringify(payload, null, 2));
    checkpointResults.push({ month, file, games: filtered.length, final_games: filtered.filter(g => g.status === 'FINAL').length });
    all.push(...filtered);
    onProgress({ season, month, status: 'OK', games: filtered.length });
  }
  const merged = dedupeGames(all);
  const audit = auditLiveDataset(merged.games, { teams: KBO_TEAMS, asOfDate });
  if (audit.status === 'FAIL') throw new Error(`Season audit failed: ${JSON.stringify(audit.errors.slice(0, 20))}`);
  const manifest = {
    season,
    as_of_date: asOfDate,
    checkpoints: checkpointResults,
    provenance: buildProvenance({ season, months, games: merged.games }),
    audit
  };
  const manifestFile = path.join(outDir, 'season-manifest.json');
  await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2));
  return { checkpoints: checkpointResults, games: merged.games, manifest, manifestFile };
}
