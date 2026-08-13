const FINAL = new Set(['FINAL','FINISHED']);

export function auditSeasonGames(games, { teams = [], allowFuture = false } = {}) {
  const errors = [];
  const warnings = [];
  const ids = new Set();
  const dates = new Set();
  const teamSet = new Set(teams);

  const sorted = [...games].sort((a,b) => String(a.date).localeCompare(String(b.date)) || String(a.game_id).localeCompare(String(b.game_id)));
  for (const g of sorted) {
    if (ids.has(g.game_id)) errors.push({game_id:g.game_id, reason:'DUPLICATE_GAME_ID'});
    ids.add(g.game_id);
    dates.add(g.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(g.date)) errors.push({game_id:g.game_id, reason:'INVALID_DATE'});
    if (g.home === g.away) errors.push({game_id:g.game_id, reason:'SAME_HOME_AWAY'});
    if (teamSet.size && (!teamSet.has(g.home) || !teamSet.has(g.away))) errors.push({game_id:g.game_id, reason:'UNKNOWN_TEAM'});
    if (FINAL.has(g.status)) {
      if (!Number.isInteger(g.home_score) || !Number.isInteger(g.away_score) || g.home_score < 0 || g.away_score < 0) errors.push({game_id:g.game_id, reason:'INVALID_FINAL_SCORE'});
    } else if (!allowFuture && g.status === 'SCHEDULED' && (g.home_score != null || g.away_score != null)) {
      errors.push({game_id:g.game_id, reason:'SCHEDULED_HAS_SCORE'});
    }
  }

  const dateCounts = [...dates].sort().map(date => ({ date, games: sorted.filter(g => g.date === date).length }));
  for (const row of dateCounts) if (row.games > 10) warnings.push({date:row.date, reason:'UNUSUALLY_MANY_GAMES', games:row.games});

  return {
    status: errors.length ? 'FAIL' : 'PASS',
    games: sorted.length,
    unique_games: ids.size,
    active_dates: dates.size,
    date_range: sorted.length ? { from: sorted[0].date, to: sorted.at(-1).date } : null,
    date_counts: dateCounts,
    errors,
    warnings
  };
}
