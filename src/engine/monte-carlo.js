import { applyGames, rankTeams } from './standings.js';

export const DEFAULT_PROBABILITIES = {
  HOME_WIN: 0.47,
  AWAY_WIN: 0.47,
  DRAW: 0.06
};

export function normalizeProbabilities(p = {}) {
  const values = {
    HOME_WIN: Number(p.HOME_WIN ?? p.home_win ?? DEFAULT_PROBABILITIES.HOME_WIN),
    AWAY_WIN: Number(p.AWAY_WIN ?? p.away_win ?? DEFAULT_PROBABILITIES.AWAY_WIN),
    DRAW: Number(p.DRAW ?? p.draw ?? DEFAULT_PROBABILITIES.DRAW)
  };
  for (const [key, value] of Object.entries(values)) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid probability: ${key}`);
  }
  const total = values.HOME_WIN + values.AWAY_WIN + values.DRAW;
  if (total <= 0) throw new Error('Probability total must be greater than zero');
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v / total]));
}

export function createSeededRng(seed = 1) {
  let state = Number(seed) >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sampleOutcome(probabilities, random = Math.random) {
  const p = normalizeProbabilities(probabilities);
  const r = random();
  if (r < p.HOME_WIN) return 'HOME_WIN';
  if (r < p.HOME_WIN + p.AWAY_WIN) return 'AWAY_WIN';
  return 'DRAW';
}

export function materializeSample(g, outcome) {
  if (outcome === 'HOME_WIN') return { ...g, outcome, status: 'FINAL', home_score: 1, away_score: 0 };
  if (outcome === 'AWAY_WIN') return { ...g, outcome, status: 'FINAL', home_score: 0, away_score: 1 };
  if (outcome === 'DRAW') return { ...g, outcome, status: 'FINAL', home_score: 0, away_score: 0 };
  throw new Error(`Unknown outcome: ${outcome}`);
}

function gameProbabilities(game, defaults) {
  return game.probabilities ?? {
    HOME_WIN: game.home_win_probability ?? defaults.HOME_WIN,
    AWAY_WIN: game.away_win_probability ?? defaults.AWAY_WIN,
    DRAW: game.draw_probability ?? defaults.DRAW
  };
}

export function simulateMonteCarlo(standings, games, options = {}) {
  const iterations = Number(options.iterations ?? 10000);
  const focusTeam = options.focusTeam ?? 'HANWHA';
  const defaults = normalizeProbabilities(options.defaultProbabilities);
  const random = options.random ?? Math.random;
  if (!Number.isInteger(iterations) || iterations <= 0) throw new Error('iterations must be a positive integer');
  if (!Array.isArray(games)) throw new Error('games must be an array');
  if (!standings.some(t => t.team === focusTeam)) throw new Error(`Unknown focus team: ${focusTeam}`);

  const rankCounts = {};
  let rankSum = 0;
  const outcomeCounts = Object.fromEntries(games.map(g => [g.game_id, { HOME_WIN: 0, AWAY_WIN: 0, DRAW: 0 }]));
  const samples = [];
  const retainSamples = Boolean(options.retainSamples);
  // Track the true best/worst-rank examples incrementally instead of storing every
  // iteration: the previous version kept only the first 5 iterations drawn (regardless of
  // their rank) and then filtered that tiny, unsorted slice by the final bestRank/worstRank,
  // which for 100k iterations almost always produced an empty best_cases/worst_cases.
  let bestRankSeen = Infinity;
  let worstRankSeen = -Infinity;
  let bestCases = [];
  let worstCases = [];
  const quantileRanks = [];

  for (let i = 0; i < iterations; i++) {
    const sampled = games.map(g => {
      const outcome = sampleOutcome(gameProbabilities(g, defaults), random);
      outcomeCounts[g.game_id][outcome]++;
      return materializeSample(g, outcome);
    });
    const ranked = rankTeams(applyGames(standings, sampled));
    const focus = ranked.find(t => t.team === focusTeam);
    rankCounts[focus.rank] = (rankCounts[focus.rank] ?? 0) + 1;
    rankSum += focus.rank;
    const outcomes = sampled.map(g => ({ game_id: g.game_id, outcome: g.outcome }));
    if (retainSamples) samples.push({ id: i + 1, rank: focus.rank, outcomes });
    if (focus.rank < bestRankSeen) { bestRankSeen = focus.rank; bestCases = [{ id: i + 1, rank: focus.rank, outcomes }]; }
    else if (focus.rank === bestRankSeen && bestCases.length < 5) bestCases.push({ id: i + 1, rank: focus.rank, outcomes });
    if (focus.rank > worstRankSeen) { worstRankSeen = focus.rank; worstCases = [{ id: i + 1, rank: focus.rank, outcomes }]; }
    else if (focus.rank === worstRankSeen && worstCases.length < 5) worstCases.push({ id: i + 1, rank: focus.rank, outcomes });
    quantileRanks.push(focus.rank);
  }

  const rankDistribution = Object.fromEntries(
    Object.entries(rankCounts)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([rank, count]) => [rank, { count, probability: Number((count / iterations).toFixed(4)), percent: Number((count / iterations * 100).toFixed(2)) }])
  );
  const bestRank = Math.min(...Object.keys(rankCounts).map(Number));
  const worstRank = Math.max(...Object.keys(rankCounts).map(Number));
  quantileRanks.sort((a,b)=>a-b);
  const q = (x) => quantileRanks[Math.min(quantileRanks.length-1, Math.max(0, Math.ceil(x*quantileRanks.length)-1))];
  return {
    iterations,
    focus_team: focusTeam,
    best_rank: bestRank,
    worst_rank: worstRank,
    expected_rank: Number((rankSum / iterations).toFixed(4)),
    rank_quantiles: { p10:q(0.10), p50:q(0.50), p90:q(0.90) },
    top3_probability: Number((Object.entries(rankCounts).filter(([rank]) => Number(rank) <= 3).reduce((s, [, c]) => s + c, 0) / iterations).toFixed(4)),
    rank_distribution: rankDistribution,
    sampled_outcome_distribution: Object.fromEntries(Object.entries(outcomeCounts).map(([id, counts]) => [id, Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, Number((v / iterations).toFixed(4))]))])),
    best_cases: retainSamples ? samples.filter(x => x.rank === bestRank).slice(0, 5) : bestCases,
    worst_cases: retainSamples ? samples.filter(x => x.rank === worstRank).slice(0, 5) : worstCases
  };
}
