import { parseBoxScoreResponse } from './box-score-parser.js';

export const BOX_SCORE_URL = 'https://www.koreabaseball.com/ws/Schedule.asmx/GetBoxScoreScroll';

// Unlike the rest of src/collector/ (which drives a real Playwright browser because KBO's
// schedule/standings pages are client-rendered ASP.NET WebForms with no real query-string
// routing — see daily-standings.js), GetBoxScoreScroll is a plain JSON web service. A bare
// fetch() with the right headers returns the same JSON the page's own AJAX call gets, without
// needing a browser at all — confirmed by comparing against the rendered page's DOM for the
// same gameId. `X-Requested-With: XMLHttpRequest` is required; without it the endpoint
// returns the site's default HTML shell instead of JSON (ASP.NET ASMX behavior).
export async function fetchBoxScore({ gameId, asOf, homeTeam, awayTeam, seasonId, leId = 1, srId = 0, timeout = 15000, fetchImpl = fetch } = {}) {
  if (!gameId || !asOf || !homeTeam || !awayTeam) {
    throw new Error('fetchBoxScore: gameId, asOf, homeTeam, and awayTeam are all required — GetBoxScoreScroll never reports game/team identity itself (see box-score-parser.js)');
  }
  const season = seasonId ?? Number(String(gameId).slice(0, 4));
  const gameDate = `${String(gameId).slice(0, 4)}${String(gameId).slice(4, 6)}${String(gameId).slice(6, 8)}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetchImpl(BOX_SCORE_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Referer': `https://www.koreabaseball.com/Schedule/GameCenter/Main.aspx?gameDate=${gameDate}&gameId=${gameId}&section=REVIEW`,
      },
      body: `leId=${leId}&srId=${srId}&seasonId=${season}&gameId=${gameId}`,
    });
    if (!res.ok) throw new Error(`fetchBoxScore: HTTP ${res.status} for gameId=${gameId}`);
    let raw;
    try {
      raw = await res.json();
    } catch {
      throw new Error(`fetchBoxScore: non-JSON response for gameId=${gameId} (missing X-Requested-With header handling upstream?)`);
    }
    if (!raw?.arrHitter || !raw?.arrPitcher) throw new Error(`fetchBoxScore: unexpected response shape for gameId=${gameId}`);
    return parseBoxScoreResponse(raw, { gameId, asOf, homeTeam, awayTeam });
  } finally {
    clearTimeout(t);
  }
}

/** Fetches box scores for many games sequentially with a small delay between requests and a
 * bounded number of retries per game, so one bad/slow game doesn't take down a whole
 * multi-hundred-game backfill. Failures are collected, not thrown, so the caller can decide
 * whether a partial result is acceptable (it normally is not for production input — see
 * Rule 1 in DEVELOPMENT_STATUS.md — but is fine while backtesting).
 *
 * `games` is a list of `{gameId, asOf, homeTeam, awayTeam}` — the real KBO gameId
 * (e.g. "20260801LGOB0"), NOT the synthetic `game_id` src/collector/parser.js generates from
 * the schedule table (`${date}-${away}-${home}-${n}`). As of this writing nothing in this
 * repo extracts the real KBO gameId (it lives in the Schedule page's "게임센터" column href,
 * which parser.js never reads) — resolving that is a prerequisite for calling this at season
 * scale, not something this function can paper over. */
export async function fetchBoxScores(games, { delayMs = 250, retries = 2, onProgress, ...opts } = {}) {
  const results = [];
  const errors = [];
  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    let lastErr;
    let ok = false;
    for (let attempt = 0; attempt <= retries && !ok; attempt++) {
      try {
        const box = await fetchBoxScore({ ...game, ...opts });
        results.push(box);
        ok = true;
      } catch (err) {
        lastErr = err;
        if (attempt < retries) await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
      }
    }
    if (!ok) errors.push({ gameId: game.gameId, error: String(lastErr?.message ?? lastErr) });
    onProgress?.({ done: i + 1, total: games.length, gameId: game.gameId, ok });
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }
  return { results, errors };
}
