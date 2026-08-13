const PLAYOFF_CUTOFF = 5;
const TEAM_COUNT = 10;

function pct1(x) {
  if (!x) return '0';
  return (x * 100).toFixed(1);
}

function korDate(gameId) {
  const m = String(gameId).match(/^(\d{4})(\d{2})(\d{2})-/);
  if (!m) return gameId;
  return `${Number(m[2])}월 ${Number(m[3])}일`;
}

function matchup(gameId) {
  // game_id format is `${date}-${away}-${home}-${n}` (see src/collector/parser.js).
  const parts = String(gameId).split('-');
  return { away: parts[1] ?? '?', home: parts[2] ?? '?' };
}

/** Pulls the focus team's own win/loss conditional playoff probabilities out of
 * estimateGameImportance()'s `conditional` array (HOME_WIN/DRAW/AWAY_WIN, each keyed
 * to whichever side is literally home), by first working out which side the focus
 * team is on for this particular game. */
function focusScenarios(game, focusTeam) {
  if (!game.conditional) throw new Error(`buildGamesHtml: important game ${game.game_id} is missing conditional outcomes`);
  const { home } = matchup(game.game_id);
  const focusIsHome = home === focusTeam;
  const byOutcome = Object.fromEntries(game.conditional.map((c) => [c.outcome, c.playoff_probability]));
  return {
    win: byOutcome[focusIsHome ? 'HOME_WIN' : 'AWAY_WIN'],
    loss: byOutcome[focusIsHome ? 'AWAY_WIN' : 'HOME_WIN'],
  };
}

/** wins-behind formula, generalized to any reference row (not just 1st place). */
function gamesBehind(ref, row) {
  return (((ref.wins - row.wins) + (row.losses - ref.losses)) / 2).toFixed(1);
}

function buildLadderHtml(rankDistribution, currentRank) {
  const byRank = new Map(rankDistribution.map((r) => [r.rank, r.probability]));
  const rows = [];
  for (let rank = 1; rank <= TEAM_COUNT; rank++) {
    const p = byRank.get(rank) ?? 0;
    const cls = rank === currentRank ? 'now' : rank <= PLAYOFF_CUTOFF ? 'hunt' : '';
    rows.push(`<div class="rung ${cls}" data-pct="${(p * 100).toFixed(2)}"><div class="pos">${rank}</div><div class="track"><div class="fill"></div></div><div class="pct">${pct1(p)}%</div></div>`);
    if (rank === PLAYOFF_CUTOFF) {
      rows.push('<div class="cutoff"><span class="txt">↑ 가을야구</span><span class="line"></span><span class="txt">탈락 ↓</span></div>');
    }
  }
  return rows.join('\n      ');
}

function buildGamesHtml(importantGames, focusTeam) {
  if (!importantGames.length) {
    return '<p class="empty">잔여 경기에 대한 임팩트 데이터가 아직 없다.</p>';
  }
  const top = importantGames.slice(0, 6);
  const max = Math.max(...top.map((g) => g.impact_range)) || 1;
  return top.map((g) => {
    const { away, home } = matchup(g.game_id);
    const width = Math.max(6, Math.round((g.impact_range / max) * 100));
    const { win, loss } = focusScenarios(g, focusTeam);
    return `<div class="game">
        <div class="date">${korDate(g.game_id)}</div>
        <div class="match">${away}<span class="vs">vs</span>${home}</div>
        <div class="impact"><div class="bar"><i style="width:${width}%"></i></div></div>
        <div class="scenario"><span class="win">이기면 ${(win * 100).toFixed(2)}%</span><span class="loss">지면 ${(loss * 100).toFixed(2)}%</span></div>
      </div>`;
  }).join('\n      ');
}

function buildStandingsHtml(allRows, focusTeam) {
  const leader = allRows.find((r) => r.rank === 1) ?? allRows[0];
  const sorted = [...allRows].sort((a, b) => a.rank - b.rank);
  const rows = sorted.map((r) => {
    const gb = r.rank === 1 ? '-' : gamesBehind(leader, r);
    const isFocus = r.team === focusTeam;
    const cls = [isFocus ? 'me' : '', r.rank <= PLAYOFF_CUTOFF ? 'hunt' : ''].filter(Boolean).join(' ');
    const wr = r.wins + r.losses > 0 ? r.wins / (r.wins + r.losses) : 0;
    const rowHtml = `<tr class="${cls}"><td>${r.rank}</td><td>${r.team}</td><td>${r.wins}</td><td>${r.losses}</td><td>${r.draws}</td><td>${wr.toFixed(4).replace(/^0/, '')}</td><td>${gb}</td></tr>`;
    return r.rank === PLAYOFF_CUTOFF ? `${rowHtml}<tr class="cutoff-row"><td colspan="7"><span class="line"></span></td></tr>` : rowHtml;
  });
  return rows.join('\n        ');
}

/**
 * Fills templates/landing.html with values from a production report + the current
 * standings row for the focus team. Throws rather than silently rendering a page with
 * missing data — a broken build must fail the CI job, not publish a half-empty page.
 */
export function buildLandingHtml({ template, report, focusRow, refRow, allRows, gamesCollected, officialCount }) {
  if (!report?.summary || !focusRow) throw new Error('buildLandingHtml: report and focusRow are required');

  const winRate = focusRow.wins + focusRow.losses > 0
    ? focusRow.wins / (focusRow.wins + focusRow.losses)
    : 0;

  const values = {
    AS_OF: report.as_of,
    RANK: String(focusRow.rank),
    GB: focusRow.rank <= PLAYOFF_CUTOFF ? '0.0' : gamesBehind(refRow, focusRow),
    WINS: String(focusRow.wins),
    LOSSES: String(focusRow.losses),
    DRAWS: String(focusRow.draws),
    WIN_RATE: winRate.toFixed(4).replace(/^0/, ''),
    REMAINING: String(report.future_games),
    GAMES_COLLECTED: String(gamesCollected),
    RECONCILE_CHECKS: `${officialCount} / ${officialCount}`,
    PLAYOFF_PCT: (report.summary.playoff_probability * 100).toFixed(2),
    MEDIAN_PCT: (report.uncertainty.playoff_probability.median * 100).toFixed(2),
    P10_PCT: (report.uncertainty.playoff_probability.p10 * 100).toFixed(2),
    P90_PCT: (report.uncertainty.playoff_probability.p90 * 100).toFixed(2),
    LADDER_HTML: buildLadderHtml(report.rank_distribution, focusRow.rank),
    GAMES_HTML: buildGamesHtml(report.important_games ?? [], focusRow.team),
    STANDINGS_HTML: buildStandingsHtml(allRows ?? [focusRow, refRow], focusRow.team),
  };

  let html = template;
  for (const [token, value] of Object.entries(values)) {
    html = html.replaceAll(`{{${token}}}`, value);
  }
  const missing = html.match(/\{\{[A-Z_]+\}\}/g);
  if (missing) throw new Error(`buildLandingHtml: unresolved template tokens: ${missing.join(', ')}`);
  return html;
}

export { PLAYOFF_CUTOFF };
