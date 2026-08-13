import { walkForwardBacktest } from './elo.js';

export const DEFAULT_K_FACTORS = [10, 20, 30, 40, 50];
export const DEFAULT_HOME_ADVANTAGES = [0, 25, 50, 75, 100];

export function evaluateEloGrid(games, {
  kFactors = DEFAULT_K_FACTORS,
  homeAdvantages = DEFAULT_HOME_ADVANTAGES,
  initialRating = 1500,
  drawProbability = 0.06,
  teams,
} = {}) {
  const results = [];
  for (const kFactor of kFactors) {
    for (const homeAdvantage of homeAdvantages) {
      const r = walkForwardBacktest(games, { initialRating, drawProbability, kFactor, homeAdvantage, teams });
      results.push({ kFactor, homeAdvantage, games: r.games, accuracy: r.accuracy, log_loss: r.log_loss, brier_score: r.brier_score });
    }
  }
  const byLogLoss = [...results].sort((a,b)=>a.log_loss-b.log_loss || a.brier_score-b.brier_score || b.accuracy-a.accuracy);
  const byBrier = [...results].sort((a,b)=>a.brier_score-b.brier_score || a.log_loss-b.log_loss || b.accuracy-a.accuracy);
  return { results, best_by_log_loss: byLogLoss[0] ?? null, best_by_brier: byBrier[0] ?? null };
}
