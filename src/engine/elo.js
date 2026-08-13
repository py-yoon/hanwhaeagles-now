export const DEFAULT_ELO_OPTIONS = { initialRating: 1500, kFactor: 20, homeAdvantage: 50, drawProbability: 0.06 };

export function expectedScore(homeRating, awayRating, homeAdvantage = 50) {
  const diff = (homeRating + homeAdvantage) - awayRating;
  return 1 / (1 + 10 ** (-diff / 400));
}

export function gameProbabilities(homeRating, awayRating, options = {}) {
  const o = { ...DEFAULT_ELO_OPTIONS, ...options };
  if (!(o.drawProbability >= 0 && o.drawProbability < 1)) throw new Error('drawProbability must be in [0,1)');
  const expected = expectedScore(homeRating, awayRating, o.homeAdvantage);
  return { HOME_WIN: (1 - o.drawProbability) * expected, AWAY_WIN: (1 - o.drawProbability) * (1 - expected), DRAW: o.drawProbability };
}

export function outcomeFromGame(game) {
  if (game.home_score > game.away_score) return 'HOME_WIN';
  if (game.home_score < game.away_score) return 'AWAY_WIN';
  return 'DRAW';
}

export function updateRatings(ratings, game, options = {}) {
  const o = { ...DEFAULT_ELO_OPTIONS, ...options };
  const home = ratings[game.home] ?? o.initialRating;
  const away = ratings[game.away] ?? o.initialRating;
  const expected = expectedScore(home, away, o.homeAdvantage);
  const actual = outcomeFromGame(game) === 'HOME_WIN' ? 1 : outcomeFromGame(game) === 'DRAW' ? 0.5 : 0;
  const delta = o.kFactor * (actual - expected);
  return { ...ratings, [game.home]: home + delta, [game.away]: away - delta };
}

export function walkForwardBacktest(games, options = {}) {
  const o = { ...DEFAULT_ELO_OPTIONS, ...options };
  const ratings = Object.fromEntries((options.teams ?? [...new Set(games.flatMap(g => [g.home, g.away]))]).map(t => [t, o.initialRating]));
  let logLoss = 0, brier = 0, correct = 0;
  const rows = [];
  for (const game of games.filter(g => g.status === 'FINAL' || g.status === 'FINISHED')) {
    const probs = gameProbabilities(ratings[game.home] ?? o.initialRating, ratings[game.away] ?? o.initialRating, o);
    const actual = outcomeFromGame(game);
    const p = probs[actual];
    logLoss += -Math.log(Math.max(p, 1e-15));
    const actualVec = { HOME_WIN: 0, AWAY_WIN: 0, DRAW: 0 }; actualVec[actual] = 1;
    brier += (probs.HOME_WIN-actualVec.HOME_WIN)**2 + (probs.AWAY_WIN-actualVec.AWAY_WIN)**2 + (probs.DRAW-actualVec.DRAW)**2;
    const predicted = Object.entries(probs).sort((a,b)=>b[1]-a[1])[0][0];
    if (predicted === actual) correct++;
    rows.push({ game_id: game.game_id, date: game.date, actual, probabilities: probs, home_elo_before: ratings[game.home] ?? o.initialRating, away_elo_before: ratings[game.away] ?? o.initialRating, correct: predicted === actual });
    Object.assign(ratings, updateRatings(ratings, game, o));
  }
  const n = rows.length;
  return { games: n, accuracy: n ? correct/n : 0, log_loss: n ? logLoss/n : 0, brier_score: n ? brier/n : 0, final_ratings: ratings, rows };
}

export function buildEloTimeline(games, options = {}) {
  const o = { ...DEFAULT_ELO_OPTIONS, ...options };
  const teams = options.teams ?? [...new Set(games.flatMap(g => [g.home, g.away]))];
  const ratings = Object.fromEntries(teams.map(t => [t, o.initialRating]));
  const rows = [];
  for (const game of games.filter(g => g.status === 'FINAL' || g.status === 'FINISHED')) {
    const homeBefore = ratings[game.home] ?? o.initialRating;
    const awayBefore = ratings[game.away] ?? o.initialRating;
    const probabilities = gameProbabilities(homeBefore, awayBefore, o);
    rows.push({
      game_id: game.game_id, date: game.date, home: game.home, away: game.away,
      home_elo_before: homeBefore, away_elo_before: awayBefore, probabilities
    });
    Object.assign(ratings, updateRatings(ratings, game, o));
    rows[rows.length - 1].home_elo_after = ratings[game.home];
    rows[rows.length - 1].away_elo_after = ratings[game.away];
  }
  return { rows, initial_ratings: Object.fromEntries(teams.map(t => [t, o.initialRating])), final_ratings: { ...ratings } };
}

export function eloSnapshotAtDate(timeline, date) {
  const rows = timeline.rows.filter(r => r.date <= date);
  if (!rows.length) return { date, ratings: { ...(timeline.initial_ratings ?? {}) }, games_processed: 0 };
  const ratings = {};
  for (const r of rows) { ratings[r.home] = r.home_elo_after; ratings[r.away] = r.away_elo_after; }
  return { date, ratings, games_processed: rows.length };
}
