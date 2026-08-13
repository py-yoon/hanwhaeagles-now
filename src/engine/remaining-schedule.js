import { gameProbabilities } from './elo.js';

export function filterRemainingGames(games, asOfDate) {
  return games.filter(g => {
    if (!['SCHEDULED','POSTPONED','RESCHEDULED'].includes(g.status ?? 'SCHEDULED')) return false;
    if (asOfDate && g.date <= asOfDate) return false;
    return true;
  }).sort((a,b) => a.date.localeCompare(b.date) || String(a.game_id).localeCompare(String(b.game_id)));
}

export function attachEloProbabilities(games, ratings, eloOptions = {}) {
  return games.map(g => ({
    ...g,
    probabilities: gameProbabilities(ratings[g.home] ?? eloOptions.initialRating ?? 1500, ratings[g.away] ?? eloOptions.initialRating ?? 1500, eloOptions)
  }));
}

export function validateRemainingSchedule(games, teams) {
  const teamSet = new Set(teams);
  const ids = new Set();
  const errors = [];
  for (const g of games) {
    if (!g.game_id || ids.has(g.game_id)) errors.push(`duplicate game_id: ${g.game_id}`);
    ids.add(g.game_id);
    if (!teamSet.has(g.home) || !teamSet.has(g.away)) errors.push(`unknown team: ${g.game_id}`);
    if (g.home === g.away) errors.push(`same home/away: ${g.game_id}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(g.date)) errors.push(`invalid date: ${g.game_id}`);
  }
  return { status: errors.length ? 'FAIL' : 'PASS', games: games.length, errors };
}
