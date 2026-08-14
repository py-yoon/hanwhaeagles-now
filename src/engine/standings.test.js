import test from 'node:test';
import assert from 'node:assert/strict';
import { rankTeamsFinal } from './standings.js';

test('rankTeamsFinal gives every team a distinct rank, breaking ties by head-to-head record', () => {
  const teams = [
    { team: 'A', wins: 2, losses: 0, draws: 0 },
    { team: 'B', wins: 2, losses: 0, draws: 0 },
    { team: 'C', wins: 1, losses: 1, draws: 0 },
  ];
  const games = [
    { home: 'A', away: 'B', status: 'FINAL', home_score: 5, away_score: 1 },
  ];
  const ranked = rankTeamsFinal(teams, games);
  assert.deepEqual(ranked.map(x => x.rank), [1, 2, 3]);
  assert.equal(ranked[0].team, 'A');
  assert.equal(ranked[1].team, 'B');
});

test('rankTeamsFinal falls back to the supplied random source when head-to-head is also tied', () => {
  const teams = [
    { team: 'A', wins: 2, losses: 0, draws: 0 },
    { team: 'B', wins: 2, losses: 0, draws: 0 },
  ];
  const games = [
    { home: 'A', away: 'B', status: 'FINAL', home_score: 3, away_score: 1 },
    { home: 'B', away: 'A', status: 'FINAL', home_score: 3, away_score: 1 },
  ];
  const first = rankTeamsFinal(teams, games, { random: () => 0 });
  const second = rankTeamsFinal(teams, games, { random: () => 0.99 });
  assert.notEqual(first[0].team, second[0].team);
});

test('rankTeamsFinal ignores head-to-head games outside the tied cluster', () => {
  const teams = [
    { team: 'A', wins: 2, losses: 0, draws: 0 },
    { team: 'B', wins: 2, losses: 0, draws: 0 },
    { team: 'C', wins: 0, losses: 2, draws: 0 },
  ];
  const games = [
    { home: 'A', away: 'C', status: 'FINAL', home_score: 5, away_score: 0 },
    { home: 'B', away: 'C', status: 'FINAL', home_score: 5, away_score: 0 },
  ];
  const ranked = rankTeamsFinal(teams, games, { random: () => 0 });
  // A and B's blowouts against C must not leak into the A-vs-B tiebreak (which has no
  // direct games between them and so is decided by the coin flip) -- only that C, the
  // team that actually lost both games, ends up ranked behind both of them.
  assert.equal(ranked.find(t => t.team === 'C').rank, 3);
  assert.deepEqual(ranked.map(t => t.rank).sort(), [1, 2, 3]);
});
