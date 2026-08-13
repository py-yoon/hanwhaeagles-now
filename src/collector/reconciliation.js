import { normalizeGameStatus } from './live-ingest.js';

function keyPart(v) { return String(v ?? '').trim().toUpperCase(); }

export function gameFingerprint(game) {
  return [game.date, keyPart(game.away), keyPart(game.home), game.time ?? ''].join('|');
}

export function reconcileGameSources(primary = [], secondary = []) {
  const a = new Map(primary.map(g => [gameFingerprint(g), g]));
  const b = new Map(secondary.map(g => [gameFingerprint(g), g]));
  const onlyPrimary = [];
  const onlySecondary = [];
  const conflicts = [];
  for (const [key, g] of a) {
    if (!b.has(key)) { onlyPrimary.push(g); continue; }
    const h = b.get(key);
    const sa = normalizeGameStatus(g), sb = normalizeGameStatus(h);
    const scoreConflict = sa === 'FINAL' && sb === 'FINAL' &&
      (g.home_score !== h.home_score || g.away_score !== h.away_score);
    const statusConflict = sa !== sb && !(sa === 'FINAL' && sb === 'FINISHED') && !(sa === 'FINISHED' && sb === 'FINAL');
    if (scoreConflict || statusConflict) {
      conflicts.push({ key, reason: scoreConflict ? 'SCORE_CONFLICT' : 'STATUS_CONFLICT', primary: g, secondary: h });
    }
  }
  for (const [key, g] of b) if (!a.has(key)) onlySecondary.push(g);
  return {
    status: onlyPrimary.length || onlySecondary.length || conflicts.length ? 'FAIL' : 'PASS',
    matched: a.size - onlyPrimary.length,
    only_primary: onlyPrimary,
    only_secondary: onlySecondary,
    conflicts
  };
}

export function assertReconciled(primary, secondary) {
  const result = reconcileGameSources(primary, secondary);
  if (result.status !== 'PASS') {
    throw new Error(`Game source reconciliation failed: ${JSON.stringify(result)}`);
  }
  return result;
}
