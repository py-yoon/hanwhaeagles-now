import fs from 'node:fs/promises';

const SEASON = 2026;
const TEAM = 'HANWHA';
const GAMES_PATH = `data/raw/production-${SEASON}.json`;
const BOX_SCORES_PATH = `data/live/box-scores-${SEASON}.json`;
const SWINGS_PATH = `data/live/game-swings-${SEASON}.json`;
const OUT_PATH = `docs/games-${SEASON}.js`;

function starterOf(boxGame, team) {
  if (!boxGame) return null;
  const row = (boxGame.pitchingRows ?? []).find((r) => r.team === team);
  if (!row) return null;
  const idx = row.player_id.indexOf('-');
  return idx === -1 ? row.player_id : row.player_id.slice(idx + 1);
}

function resultFor(g) {
  const isHome = g.home === TEAM;
  const us = isHome ? g.home_score : g.away_score;
  const them = isHome ? g.away_score : g.home_score;
  if (us > them) return 'WIN';
  if (us < them) return 'LOSS';
  return 'DRAW';
}

async function main() {
  const gamesPayload = JSON.parse(await fs.readFile(GAMES_PATH, 'utf8'));
  let boxByKey = {};
  try {
    const boxPayload = JSON.parse(await fs.readFile(BOX_SCORES_PATH, 'utf8'));
    boxByKey = boxPayload.boxScoresByGameId ?? {};
  } catch {
    console.log(`[games-log] no box-score cache at ${BOX_SCORES_PATH} — building without starters`);
  }

  // Swing data (see build-game-swings.mjs) is an optional enrichment — a game log without it
  // still renders fine, just without the probability-swing chip, so a missing/partial cache
  // must not fail this build.
  let swingsByKey = {};
  try {
    const swingsPayload = JSON.parse(await fs.readFile(SWINGS_PATH, 'utf8'));
    swingsByKey = swingsPayload.games ?? {};
  } catch {
    console.log(`[games-log] no swing cache at ${SWINGS_PATH} — building without probability swings`);
  }

  const finalGames = (gamesPayload.games ?? [])
    .filter((g) => (g.home === TEAM || g.away === TEAM) && String(g.status).toUpperCase() === 'FINAL')
    .sort((a, b) => b.date.localeCompare(a.date) || String(b.game_id).localeCompare(String(a.game_id)));

  let wins = 0, losses = 0, draws = 0, withStarters = 0, withSwings = 0;
  const games = finalGames.map((g) => {
    const isHome = g.home === TEAM;
    const opponent = isHome ? g.away : g.home;
    const box = boxByKey[g.game_id];
    const hanwhaStarter = starterOf(box, TEAM);
    const oppStarter = starterOf(box, opponent);
    const result = resultFor(g);
    if (result === 'WIN') wins++; else if (result === 'LOSS') losses++; else draws++;
    if (hanwhaStarter && oppStarter) withStarters++;
    const swing = swingsByKey[g.game_id] ?? null;
    if (swing) withSwings++;
    return {
      game_id: g.game_id,
      date: g.date,
      home: isHome,
      opponent,
      hanwhaScore: isHome ? g.home_score : g.away_score,
      oppScore: isHome ? g.away_score : g.home_score,
      result,
      hanwhaStarter,
      oppStarter,
      probabilityDeltaPct: swing ? swing.delta_pct : null,
      probabilityBefore: swing ? swing.before : null,
      probabilityAfter: swing ? swing.after : null,
    };
  });

  const payload = {
    meta: {
      season: SEASON,
      team: TEAM,
      generated: new Date().toISOString().slice(0, 10),
      source: `${GAMES_PATH} + ${BOX_SCORES_PATH} (선발투수는 KBO 박스스코어 투수 등판 순서 중 첫 번째로 추정)`,
      record: { wins, losses, draws, games: games.length },
      games_with_starters: withStarters,
      games_with_swings: withSwings,
    },
    games,
  };

  const js = `window.EAGLES_GAMES_${SEASON} = ${JSON.stringify(payload, null, 2)};\n`;
  await fs.writeFile(OUT_PATH, js);
  console.log(`Wrote ${OUT_PATH} — ${games.length} games (${wins}W ${losses}L ${draws}D), starters known for ${withStarters}, swings known for ${withSwings}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
