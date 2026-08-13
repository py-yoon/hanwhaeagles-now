import { forecastSchedule } from './game-forecast.js';
import { simulateMonteCarlo, createSeededRng } from '../engine/monte-carlo.js';

const FINAL = new Set(['FINAL','FINISHED']);
const FUTURE = new Set(['SCHEDULED','POSTPONED','RESCHEDULED']);

function assertFiniteProbabilities(p) {
  const sum = ['HOME_WIN','DRAW','AWAY_WIN'].reduce((s,k) => s + Number(p[k] ?? 0), 0);
  if (!Number.isFinite(sum) || Math.abs(sum - 1) > 1e-8) throw new Error('probabilities must sum to 1');
}

export function buildIntegratedFutureGames(games, snapshots, options = {}) {
  const asOf = options.asOf ? new Date(options.asOf).getTime() : -Infinity;
  if (options.asOf && !Number.isFinite(asOf)) throw new Error('invalid asOf');
  const future = games.filter(g => {
    const status = String(g.status ?? '').toUpperCase();
    if (FINAL.has(status)) return false;
    if (!FUTURE.has(status)) return false;
    if (options.asOf) {
      const t = new Date(g.date).getTime();
      if (!Number.isFinite(t) || t < asOf) return false;
    }
    return true;
  });
  const forecasts = forecastSchedule(future, snapshots, options);
  forecasts.forEach(f => assertFiniteProbabilities(f.probabilities));
  return forecasts;
}

export function runIntegratedMonteCarlo({standings, games, snapshots, focusTeam='HANWHA', iterations=100000, seed=20260812, asOf, weights, random, retainSamples=false, psCutoff=5} = {}) {
  if (!Array.isArray(standings) || !standings.length) throw new Error('standings required');
  if (!Array.isArray(games)) throw new Error('games required');
  if (!Number.isInteger(iterations) || iterations < 1000) throw new Error('iterations must be >= 1000');
  const forecasts = buildIntegratedFutureGames(games, snapshots, {asOf, weights});
  const result = simulateMonteCarlo(standings, forecasts, {
    iterations,
    focusTeam,
    random: random ?? createSeededRng(seed),
    retainSamples
  });
  psCutoff = Number.isFinite(Number(psCutoff)) ? Number(psCutoff) : 5;
  const playoffProbability = Object.entries(result.rank_distribution)
    .filter(([rank]) => Number(rank) <= psCutoff)
    .reduce((s,[,v]) => s + v.probability, 0);
  return {
    model_version: '0.8.0',
    as_of: asOf ?? null,
    focus_team: focusTeam,
    iterations,
    future_games: forecasts.length,
    forecasts,
    playoff_cutoff: psCutoff,
    playoff_probability: Number(playoffProbability.toFixed(6)),
    monte_carlo: result
  };
}
