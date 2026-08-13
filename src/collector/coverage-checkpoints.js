export const SEASON_CHECKPOINTS = [
  { id: 'opening', start: '2026-03-28', end: '2026-04-05' },
  { id: 'early-april', start: '2026-04-07', end: '2026-04-30' },
  { id: 'may', start: '2026-05-01', end: '2026-05-31' },
  { id: 'june', start: '2026-06-01', end: '2026-06-30' },
  { id: 'july', start: '2026-07-01', end: '2026-07-31' },
  { id: 'current', start: '2026-08-01', end: '2026-08-11' },
];

export function auditCheckpointCoverage(games, checkpoints = SEASON_CHECKPOINTS) {
  const finals = games.filter(g => g.status === 'FINAL' || g.status === 'FINISHED');
  const ids = new Set();
  const errors = [];
  const rows = checkpoints.map(cp => {
    const inRange = finals.filter(g => g.date >= cp.start && g.date <= cp.end);
    const duplicateIds = inRange.map(g => g.game_id).filter((id, i, a) => a.indexOf(id) !== i);
    for (const id of duplicateIds) errors.push({ checkpoint: cp.id, type: 'DUPLICATE_GAME_ID', game_id: id });
    for (const g of inRange) {
      if (ids.has(g.game_id)) errors.push({ checkpoint: cp.id, type: 'CROSS_CHECKPOINT_DUPLICATE', game_id: g.game_id });
      ids.add(g.game_id);
    }
    return { ...cp, games: inRange.length, unique_games: new Set(inRange.map(g => g.game_id)).size };
  });
  return { checkpoints: rows, errors, status: errors.length ? 'FAIL' : 'PASS' };
}
