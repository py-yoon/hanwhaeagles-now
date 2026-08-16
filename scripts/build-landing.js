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

function pct2(x) {
  return (x * 100).toFixed(2);
}

/** '2026-08-13' -> '8/13' */
function korDateShort(dateStr) {
  const m = String(dateStr).match(/^\d{4}-0?(\d{1,2})-0?(\d{1,2})$/);
  return m ? `${Number(m[1])}/${Number(m[2])}` : dateStr;
}

function resultLabel(decided) {
  const wins = decided.filter((d) => d.result === 'WIN').length;
  const losses = decided.length - wins;
  if (losses === 0) return `${decided.length}연승`;
  if (wins === 0) return `${decided.length}연패`;
  return `${wins}승${losses}패`;
}

function treeBranchTagHtml(node) {
  if (!node.game) return '';
  const homeLabel = node.game.home_away === 'HOME' ? '홈' : '원정';
  const wp = node.game.focus_win_probability != null ? pct2(node.game.focus_win_probability) : '?';
  return `<span class="t-branch">${korDateShort(node.game.date)} ${node.game.opponent}(${homeLabel})<br><b>승리확률 ${wp}%</b></span>`;
}

function treeNodeCardHtml(node, maxPct) {
  const pctStr = pct2(node.playoff_probability);
  if (node.depth === 0) {
    return `<div class="t-node root">
            <span class="t-tag now">현재</span>
            <div class="pp mono">${pctStr}%</div>
            <div class="pp-label">가을야구 확률</div>
          </div>`;
  }
  const last = node.decided[node.decided.length - 1];
  const width = Math.max(1, Math.round((node.playoff_probability / maxPct) * 100));
  const tagCls = last.result === 'WIN' ? 'win' : 'loss';
  const tagLabel = last.result === 'WIN' ? '승' : '패';
  const oppLine = node.game
    ? `vs ${last.opponent} ${last.home_away === 'HOME' ? '홈' : '원정'}`
    : resultLabel(node.decided);
  return `<div class="t-node">
            <span class="t-tag ${tagCls}">${korDateShort(last.date)} ${tagLabel}</span>
            <div class="pp mono">${pctStr}%</div>
            <div class="pp-label">가을야구</div>
            <div class="t-bar"><i style="width:${width}%"></i></div>
            <div class="t-opp">${oppLine}</div>
          </div>`;
}

function treeNodeLiHtml(node, maxPct) {
  const card = treeNodeCardHtml(node, maxPct);
  if (!node.game) return `<li>\n          ${card}\n        </li>`;
  const tag = treeBranchTagHtml(node);
  return `<li data-depth="${node.depth}">
          ${card}
          ${tag}
          <ul>
            ${treeNodeLiHtml(node.win, maxPct)}
            ${treeNodeLiHtml(node.lose, maxPct)}
          </ul>
        </li>`;
}

function flattenTree(node, out = []) {
  out.push(node);
  if (node.win) flattenTree(node.win, out);
  if (node.lose) flattenTree(node.lose, out);
  return out;
}

/** Renders the win/lose branch tree (see src/model/game-tree.js) plus its
 * head-to-head cards. Returns the three template fragments as an object rather
 * than throwing on a missing tree — fewer than 3 upcoming games (very late
 * season) degrades to an explanatory empty state instead of failing the build. */
function buildTreeHtml(gameTree) {
  if (!gameTree) {
    return { descHtml: '분석할 예정 경기가 3경기 미만이라 갈림길 트리를 계산할 수 없다.', treeHtml: '', h2hHtml: '' };
  }
  const allNodes = flattenTree(gameTree.tree);
  const maxPct = Math.max(...allNodes.map((n) => n.playoff_probability)) || 1;
  const treeHtml = `<ul class="tree">\n      ${treeNodeLiHtml(gameTree.tree, maxPct)}\n    </ul>`;

  const leaves = allNodes.filter((n) => !n.game);
  const best = leaves.reduce((a, b) => (b.playoff_probability > a.playoff_probability ? b : a));
  const worst = leaves.reduce((a, b) => (b.playoff_probability < a.playoff_probability ? b : a));
  const matchupList = gameTree.target_games.map((g) => `${korDateShort(g.date)} ${g.opponent}`).join(', ');
  const descHtml = `위 세 경기(${matchupList})를 승/패로 끝까지 갈라서 재시뮬레이션했다. <b style="color:#f4ede0">${resultLabel(best.decided)}하면 ${pct2(best.playoff_probability)}%</b>까지 오르고, <b style="color:#f4ede0">${resultLabel(worst.decided)}하면 ${pct2(worst.playoff_probability)}%</b>로 사실상 끝난다. 확정된 결과가 아니라 각 갈림길 시점의 조건부 시뮬레이션 수치다.`;

  const h2hHtml = Object.entries(gameTree.head_to_head ?? {}).map(([opp, rec]) => {
    const winPct = rec.games ? Math.round((rec.wins / rec.games) * 100) : 0;
    const lossPct = rec.games ? Math.round((rec.losses / rec.games) * 100) : 0;
    const drawPct = Math.max(0, 100 - winPct - lossPct);
    const recStr = rec.draws ? `${rec.wins}승 ${rec.losses}패 ${rec.draws}무` : `${rec.wins}승 ${rec.losses}패`;
    const pctStr = rec.win_rate != null ? rec.win_rate.toFixed(3).replace(/^0/, '') : '-';
    const oppDates = gameTree.target_games.filter((g) => g.opponent === opp).map((g) => korDateShort(g.date)).join(', ');
    return `<div class="h2h-card">
        <div class="h2h-name">${opp} (${oppDates})</div>
        <div class="h2h-rec mono">${recStr}<span class="pct">${pctStr}</span></div>
        <div class="h2h-note">2026시즌 ${rec.games}경기</div>
        <div class="h2h-bar"><span class="w" style="width:${winPct}%"></span><span class="d" style="width:${drawPct}%"></span><span class="l" style="width:${lossPct}%"></span></div>
      </div>`;
  }).join('\n      ');

  return { descHtml, treeHtml, h2hHtml };
}

const KBO_REGULAR_SEASON_GAMES = 144;

/** HANWHA's own remaining games under the standard 144-game KBO regular season —
 * distinct from report.future_games, which is every remaining game across the whole
 * league (what the Monte Carlo actually simulates, since every other team's results
 * affect the focus team's final rank). Deliberately 144 minus games played, not a count
 * of currently-published SCHEDULED rows: KBO frequently finalizes rainout/doubleheader
 * makeup dates only later in the season, so the schedule page's SCHEDULED count can run
 * short of the real remaining total until KBO actually announces those dates. */
function countTeamRemainingGames(focusRow) {
  const played = focusRow.wins + focusRow.losses + focusRow.draws;
  return Math.max(0, KBO_REGULAR_SEASON_GAMES - played);
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

  const tree = buildTreeHtml(report.game_tree);

  const values = {
    AS_OF: report.as_of,
    RANK: String(focusRow.rank),
    GB: focusRow.rank <= PLAYOFF_CUTOFF ? '0.0' : gamesBehind(refRow, focusRow),
    WINS: String(focusRow.wins),
    LOSSES: String(focusRow.losses),
    DRAWS: String(focusRow.draws),
    WIN_RATE: winRate.toFixed(4).replace(/^0/, ''),
    REMAINING: String(report.future_games),
    TEAM_REMAINING: String(countTeamRemainingGames(focusRow)),
    GAMES_COLLECTED: String(gamesCollected),
    RECONCILE_CHECKS: `${officialCount} / ${officialCount}`,
    PLAYOFF_PCT: (report.summary.playoff_probability * 100).toFixed(2),
    MEDIAN_PCT: (report.uncertainty.playoff_probability.median * 100).toFixed(2),
    P10_PCT: (report.uncertainty.playoff_probability.p10 * 100).toFixed(2),
    P90_PCT: (report.uncertainty.playoff_probability.p90 * 100).toFixed(2),
    LADDER_HTML: buildLadderHtml(report.rank_distribution, focusRow.rank),
    GAMES_HTML: buildGamesHtml(report.important_games ?? [], focusRow.team),
    STANDINGS_HTML: buildStandingsHtml(allRows ?? [focusRow, refRow], focusRow.team),
    TREE_DESC: tree.descHtml,
    TREE_HTML: tree.treeHtml,
    H2H_HTML: tree.h2hHtml,
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
