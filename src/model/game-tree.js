import { runIntegratedMonteCarlo } from './integrated-monte-carlo.js';

function outcomeForFocusWin(game, focusTeam) {
  return game.home === focusTeam ? 'HOME_WIN' : 'AWAY_WIN';
}
function outcomeForFocusLoss(game, focusTeam) {
  return game.home === focusTeam ? 'AWAY_WIN' : 'HOME_WIN';
}
function forceProbabilities(outcome) {
  return { HOME_WIN: outcome === 'HOME_WIN' ? 1 : 0, DRAW: 0, AWAY_WIN: outcome === 'AWAY_WIN' ? 1 : 0 };
}

/**
 * Chains estimateGameImportance's single-game win/lose forcing across several games
 * (in the given, presumed-chronological order), building the full binary decision
 * tree of playoff probabilities: each node forces every game decided so far to its
 * branch's outcome (via a degenerate probability distribution, same mechanism as
 * estimateGameImportance) and re-runs the integrated Monte Carlo for that node's
 * value. depth 0 is the root (nothing decided yet); a 3-game tree has 15 nodes.
 */
export function estimateGameTree({ base, gameIds, iterations = 20000, seed = 20260812 } = {}) {
  if (!base?.standings || !base?.games) throw new Error('base simulation inputs required');
  if (!Array.isArray(gameIds) || !gameIds.length) throw new Error('gameIds required');
  const focusTeam = base.focusTeam ?? 'HANWHA';
  const targetGames = gameIds.map((id) => {
    const g = base.games.find((x) => x.game_id === id);
    if (!g) throw new Error(`game not found: ${id}`);
    return g;
  });

  const root = base.forecasts && base.playoff_probability != null
    ? { forecasts: base.forecasts, playoff_probability: base.playoff_probability }
    : runIntegratedMonteCarlo({ ...base, iterations, seed });

  const gameWinProb = {};
  for (const g of targetGames) {
    const f = root.forecasts.find((x) => x.game_id === g.game_id);
    const p = f?.probabilities;
    // The tree only has WIN/LOSE branches (draws aren't modeled as a third branch — a
    // forced-decided game can't end in a draw), so the displayed "win probability" should
    // be conditional on the game being decided, not the raw HOME_WIN/AWAY_WIN that still
    // has a slice sitting in DRAW. Renormalizing over just {HOME_WIN, AWAY_WIN} answers
    // "if this game has a winner, who's more likely to be it" — the question the two
    // branches are actually asking.
    const decided = p ? p.HOME_WIN + p.AWAY_WIN : 0;
    gameWinProb[g.game_id] = p && decided > 0 ? (g.home === focusTeam ? p.HOME_WIN / decided : p.AWAY_WIN / decided) : null;
  }

  function runWithForced(decided) {
    const forcedById = new Map(decided.map((d) => [d.game.game_id, d]));
    const forcedGames = base.games.map((g) => {
      const d = forcedById.get(g.game_id);
      if (!d) return g;
      return { ...g, probabilities: forceProbabilities(d.win ? outcomeForFocusWin(g, focusTeam) : outcomeForFocusLoss(g, focusTeam)) };
    });
    const r = runIntegratedMonteCarlo({ ...base, games: forcedGames, iterations, seed });
    return r.playoff_probability;
  }

  function buildNode(depth, decided) {
    const playoffProbability = depth === 0 ? root.playoff_probability : runWithForced(decided);
    const node = {
      depth,
      decided: decided.map((d) => ({
        game_id: d.game.game_id, date: d.game.date,
        opponent: d.game.home === focusTeam ? d.game.away : d.game.home,
        result: d.win ? 'WIN' : 'LOSS',
      })),
      playoff_probability: Number(playoffProbability.toFixed(6)),
    };
    if (depth < targetGames.length) {
      const game = targetGames[depth];
      node.game = {
        game_id: game.game_id,
        date: game.date,
        opponent: game.home === focusTeam ? game.away : game.home,
        home_away: game.home === focusTeam ? 'HOME' : 'AWAY',
        focus_win_probability: gameWinProb[game.game_id] != null ? Number(gameWinProb[game.game_id].toFixed(4)) : null,
      };
      node.win = buildNode(depth + 1, [...decided, { game, win: true }]);
      node.lose = buildNode(depth + 1, [...decided, { game, win: false }]);
    }
    return node;
  }

  return {
    focus_team: focusTeam,
    root_playoff_probability: Number(root.playoff_probability.toFixed(6)),
    target_games: targetGames.map((g) => ({
      game_id: g.game_id, date: g.date,
      opponent: g.home === focusTeam ? g.away : g.home,
      home_away: g.home === focusTeam ? 'HOME' : 'AWAY',
    })),
    tree: buildNode(0, []),
  };
}

/** 2026-season head-to-head record (FINAL games only) between focusTeam and each
 * opponent named in a game-tree's target_games list. */
export function headToHeadRecord(games, focusTeam, opponents) {
  return Object.fromEntries(opponents.map((opp) => {
    const played = games.filter((g) => g.status === 'FINAL' && (
      (g.home === focusTeam && g.away === opp) || (g.away === focusTeam && g.home === opp)
    ));
    let wins = 0, losses = 0, draws = 0;
    for (const g of played) {
      const focusScore = g.home === focusTeam ? g.home_score : g.away_score;
      const oppScore = g.home === focusTeam ? g.away_score : g.home_score;
      if (focusScore > oppScore) wins++;
      else if (focusScore < oppScore) losses++;
      else draws++;
    }
    return [opp, { games: played.length, wins, losses, draws, win_rate: played.length ? Number((wins / played.length).toFixed(4)) : null }];
  }));
}
