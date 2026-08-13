import { applyGames, rankTeams } from './standings.js';

export const OUTCOMES = ['HOME_WIN', 'AWAY_WIN', 'DRAW'];

export function generateOutcomes(games) {
  if (!games.length) return [[]];
  const [g, ...rest] = games;
  const tail = generateOutcomes(rest);
  return OUTCOMES.flatMap(outcome =>
    tail.map(x => [{ ...g, outcome }, ...x])
  );
}

export function materializeOutcome(g) {
  if (g.outcome === 'HOME_WIN') return { ...g, status: 'FINAL', home_score: 1, away_score: 0 };
  if (g.outcome === 'AWAY_WIN') return { ...g, status: 'FINAL', home_score: 0, away_score: 1 };
  if (g.outcome === 'DRAW') return { ...g, status: 'FINAL', home_score: 0, away_score: 0 };
  throw new Error(`Unknown scenario outcome: ${g.outcome}`);
}

export function evaluateScenarios(standings, games, focusTeam = 'HANWHA') {
  return generateOutcomes(games).map((outcomes, i) => {
    const s = rankTeams(applyGames(standings, outcomes.map(materializeOutcome)));
    const focus = s.find(t => t.team === focusTeam);
    if (!focus) throw new Error(`Unknown focus team: ${focusTeam}`);
    return {
      id: i + 1,
      rank: focus.rank,
      outcomes: outcomes.map(g => ({ game_id: g.game_id, outcome: g.outcome })),
      standings: s
    };
  });
}

export function summarizeScenarios(results) {
  if (!results.length) return { total: 0, best_rank: null, worst_rank: null, rank_distribution: {} };
  const ranks = results.map(x => x.rank);
  const distribution = {};
  for (const rank of ranks) distribution[rank] = (distribution[rank] ?? 0) + 1;
  const best = Math.min(...ranks);
  const worst = Math.max(...ranks);
  return {
    total: results.length,
    best_rank: best,
    worst_rank: worst,
    rank_distribution: Object.fromEntries(Object.entries(distribution).sort((a, b) => Number(a[0]) - Number(b[0]))),
    best_cases: results.filter(x => x.rank === best),
    worst_cases: results.filter(x => x.rank === worst)
  };
}
