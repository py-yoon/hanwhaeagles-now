// Incremental box-score fetcher for HANWHA's own games, feeding docs/games.html's starter-
// pitcher columns (via build-games-log.mjs) and any future per-player use of the game log.
//
// Unlike scripts/box-score-backtest.mjs (which re-fetches the whole league's box scores from
// scratch every run for one-off model-weight research), this only fetches HANWHA games not
// already in the cache, keyed by the same synthetic game_id build-games-log.mjs looks games
// up by. That keeps it cheap enough to run every night as part of `npm run refresh`: normally
// just the 1 (or 2, on a doubleheader) game HANWHA played since the last run.
//
// data/live/ (not data/raw/) so the cache is committed and survives between CI runs — CI
// checks out a fresh clone each time, so anything only written to data/raw/ (gitignored)
// would otherwise force a full re-fetch of the whole season nightly.
import fs from 'node:fs/promises';
import { fetchBoxScore } from '../src/collector/box-score.js';

const SEASON = Number(process.argv[2] ?? 2026);
const TEAM = 'HANWHA';
const GAMES_PATH = `data/raw/production-${SEASON}.json`;
const CACHE_PATH = `data/live/box-scores-${SEASON}.json`;

async function main() {
  const gamesPayload = JSON.parse(await fs.readFile(GAMES_PATH, 'utf8'));
  const allGames = gamesPayload.games ?? [];

  let cache = { season: SEASON, boxScoresByGameId: {} };
  try {
    cache = JSON.parse(await fs.readFile(CACHE_PATH, 'utf8'));
  } catch {
    console.log('[box-scores] no existing cache — starting fresh');
  }

  const hanwhaFinal = allGames.filter(
    (g) => (g.home === TEAM || g.away === TEAM) && String(g.status).toUpperCase() === 'FINAL'
  );
  const todo = hanwhaFinal.filter((g) => g.kbo_game_id && !cache.boxScoresByGameId[g.game_id]);
  const missingId = hanwhaFinal.filter((g) => !g.kbo_game_id && !cache.boxScoresByGameId[g.game_id]);
  if (missingId.length) {
    console.log(`[box-scores] ${missingId.length} completed HANWHA game(s) have no kbo_game_id yet (KBO hasn't published a review) — skipping for now, will retry next run`);
  }
  console.log(`[box-scores] ${hanwhaFinal.length} completed HANWHA games, ${todo.length} to fetch`);

  let fetched = 0;
  for (const g of todo) {
    try {
      const box = await fetchBoxScore({ gameId: g.kbo_game_id, asOf: g.date, homeTeam: g.home, awayTeam: g.away });
      cache.boxScoresByGameId[g.game_id] = box;
      fetched++;
      console.log(`[box-scores] fetched ${g.game_id} (kbo_game_id=${g.kbo_game_id})`);
    } catch (err) {
      console.log(`[box-scores] failed ${g.game_id}: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  await fs.mkdir('data/live', { recursive: true });
  await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2));
  console.log(`[box-scores] wrote -> ${CACHE_PATH} (${Object.keys(cache.boxScoresByGameId).length} games cached, ${fetched} newly fetched)`);
}

main().catch((err) => {
  console.error('[box-scores] ERROR', err);
  process.exit(1);
});
