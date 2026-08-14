import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeededRng, normalizeProbabilities, sampleOutcome, simulateMonteCarlo } from './monte-carlo.js';

const standings = [
  { team: 'HANWHA', wins: 6, losses: 5, draws: 0 },
  { team: 'A', wins: 7, losses: 4, draws: 0 },
  { team: 'B', wins: 6, losses: 5, draws: 0 },
  { team: 'C', wins: 5, losses: 6, draws: 0 }
];
const games = [
  { game_id: 'G1', home: 'HANWHA', away: 'A', probabilities: { HOME_WIN: 0.7, AWAY_WIN: 0.2, DRAW: 0.1 } },
  { game_id: 'G2', home: 'B', away: 'C', probabilities: { HOME_WIN: 0.5, AWAY_WIN: 0.45, DRAW: 0.05 } }
];

test('probabilities normalize and validate', () => {
  assert.deepEqual(normalizeProbabilities({ HOME_WIN: 7, AWAY_WIN: 2, DRAW: 1 }), { HOME_WIN: 0.7, AWAY_WIN: 0.2, DRAW: 0.1 });
  assert.throws(() => normalizeProbabilities({ HOME_WIN: -1, AWAY_WIN: 1, DRAW: 1 }));
});

test('seeded outcome sampler is deterministic', () => {
  const a = Array.from({ length: 10 }, () => sampleOutcome({ HOME_WIN: 0.5, AWAY_WIN: 0.4, DRAW: 0.1 }, createSeededRng(42)));
  const b = Array.from({ length: 10 }, () => sampleOutcome({ HOME_WIN: 0.5, AWAY_WIN: 0.4, DRAW: 0.1 }, createSeededRng(42)));
  assert.deepEqual(a, b);
});

test('monte carlo returns requested iterations and rank probabilities', () => {
  const result = simulateMonteCarlo(standings, games, { iterations: 5000, focusTeam: 'HANWHA', random: createSeededRng(2026) });
  assert.equal(result.iterations, 5000);
  assert.ok(result.best_rank <= result.worst_rank);
  assert.ok(result.top3_probability >= 0 && result.top3_probability <= 1);
  const total = Object.values(result.rank_distribution).reduce((sum, x) => sum + x.probability, 0);
  assert.ok(Math.abs(total - 1) < 0.001);
});

test('certain outcome produces deterministic rank', () => {
  const result = simulateMonteCarlo(standings, [
    { game_id: 'G1', home: 'HANWHA', away: 'A', probabilities: { HOME_WIN: 1, AWAY_WIN: 0, DRAW: 0 } }
  ], { iterations: 100, random: createSeededRng(1) });
  assert.equal(result.best_rank, 1);
  assert.equal(result.worst_rank, 1);
  assert.equal(result.rank_distribution['1'].probability, 1);
});

test('a win-rate tie at the final rank is broken by head-to-head record from completedGames, not shared', () => {
  // HANWHA and B both finish 6-5 with nothing left to simulate; earlier in the season
  // (already reflected in `standings`'s counts, not in `games`) HANWHA swept B 2-0.
  const tiedStandings = [
    { team: 'HANWHA', wins: 6, losses: 5, draws: 0 },
    { team: 'B', wins: 6, losses: 5, draws: 0 },
  ];
  const completedGames = [
    { home: 'HANWHA', away: 'B', status: 'FINAL', home_score: 4, away_score: 1 },
    { home: 'B', away: 'HANWHA', status: 'FINAL', home_score: 1, away_score: 5 },
  ];
  const result = simulateMonteCarlo(tiedStandings, [], { iterations: 50, focusTeam: 'HANWHA', completedGames });
  assert.equal(result.rank_distribution['1'].probability, 1);
  assert.equal(result.rank_distribution['2'], undefined);
});

test('a win-rate tie with no completedGames and no remaining head-to-head games goes to the coin-flip fallback, not a shared rank', () => {
  const tiedStandings = [
    { team: 'HANWHA', wins: 6, losses: 5, draws: 0 },
    { team: 'B', wins: 6, losses: 5, draws: 0 },
  ];
  const result = simulateMonteCarlo(tiedStandings, [], { iterations: 200, focusTeam: 'HANWHA', tiebreakRandom: createSeededRng(7) });
  // every iteration must land on a definite rank 1 or 2 for HANWHA -- never a shared rank
  const probs = Object.entries(result.rank_distribution).map(([r]) => Number(r));
  assert.deepEqual(probs.sort(), [1, 2]);
  const total = result.rank_distribution['1'].probability + result.rank_distribution['2'].probability;
  assert.ok(Math.abs(total - 1) < 1e-9);
});
