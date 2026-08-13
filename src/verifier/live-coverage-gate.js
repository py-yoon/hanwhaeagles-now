import { strict as assert } from 'node:assert';

export function validateLiveCoverage({ games = [], standings = [], asOfDate }) {
  const errors = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate ?? '')) errors.push({ reason: 'INVALID_AS_OF_DATE' });

  const finalGames = games.filter(g => g.status === 'FINAL' && (!asOfDate || g.date <= asOfDate));
  const ids = new Set();
  for (const g of finalGames) {
    if (ids.has(g.game_id)) errors.push({ reason: 'DUPLICATE_FINAL_GAME', game_id: g.game_id });
    ids.add(g.game_id);
    if (!Number.isInteger(g.home_score) || !Number.isInteger(g.away_score)) errors.push({ reason: 'FINAL_SCORE_MISSING', game_id: g.game_id });
  }

  const byTeam = new Map();
  for (const g of finalGames) {
    for (const team of [g.home, g.away]) byTeam.set(team, (byTeam.get(team) ?? 0) + 1);
  }

  if (standings.length) {
    for (const row of standings) {
      const actual = byTeam.get(row.team) ?? 0;
      if (Number.isInteger(row.games) && actual !== row.games) {
        errors.push({ reason: 'TEAM_GAME_COUNT_MISMATCH', team: row.team, replay_games: actual, official_games: row.games });
      }
    }
  }

  return {
    status: errors.length ? 'FAIL' : 'PASS',
    as_of_date: asOfDate,
    final_games: finalGames.length,
    teams_seen: byTeam.size,
    errors
  };
}

export function assertProductionCoverage(result, { expectedTeams = 10 } = {}) {
  assert.equal(result.status, 'PASS', JSON.stringify(result.errors));
  assert.equal(result.teams_seen, expectedTeams);
  return result;
}
