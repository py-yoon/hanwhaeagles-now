// Builds docs/share-card-story.svg and docs/share-card-square.svg — shareable
// "오늘의 확률 카드" images for SNS. Same pattern as scripts/build-badge.mjs:
// reads the same data/live/latest-report.json the real simulation engine
// (scripts/game-tree-forecast.mjs) already produces, instead of taking any
// manual input. Nothing here is typed by a person — every number comes from
// the pipeline's own output for the report's as_of date.
//
// Run manually:   node scripts/build-share-card.mjs
// Wire into CI:   add next to the build-badge.mjs line in refresh-and-build.js
//                 execFileSync('node', ['scripts/build-share-card.mjs'], { stdio: 'inherit' });

import fs from 'node:fs/promises';

const REPORT_PATH = 'data/live/latest-report.json';
const OUT_STORY = 'docs/share-card-story.svg';
const OUT_SQUARE = 'docs/share-card-square.svg';

// ── design tokens — copied verbatim from docs/games.css :root ─────────────
const C = {
  bg: '#0a0c0f', surface: '#12151a', line: '#262b33', lineSoft: '#1c2027',
  ink: '#edece6', inkDim: '#9aa0ab', inkFaint: '#5c626d',
  eagle: '#ff6a1a', win: '#34c98f', winWash: 'rgba(52,201,143,.12)',
  loss: '#ff5a6a', lossWash: 'rgba(255,90,106,.12)',
};
// SVG-as-<img>/embed contexts generally can't fetch @font-face, so — same
// call badge.svg already makes — we stick to system font stacks here.
const F_BODY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const F_MONO = "ui-monospace, 'SF Mono', 'IBM Plex Mono', Consolas, monospace";

function walk(tree, steps) {
  let node = tree;
  for (const step of steps) {
    if (!node || !node[step]) return null;
    node = node[step];
  }
  return node;
}

async function loadStandings(asOf) {
  const path = `data/raw/official-${asOf}.json`;
  const raw = JSON.parse(await fs.readFile(path, 'utf8'));
  const team = raw.official_standings.find((t) => t.team === 'HANWHA');
  const fifth = raw.official_standings.find((t) => t.rank === 5);
  const gamesBackFrom5th = fifth && team
    ? ((fifth.wins - team.wins) + (team.losses - fifth.losses)) / 2
    : null;
  return { ...team, gamesBackFrom5th };
}

function pill(x, y, text, color, wash, align = 'start') {
  const w = text.length * 12 + 40;
  const rectX = align === 'end' ? x - w : x;
  return `
    <rect x="${rectX}" y="${y}" width="${w}" height="40" rx="20" fill="${wash}"/>
    <text x="${rectX + w / 2}" y="${y + 27}" fill="${color}" font-family="${F_MONO}"
      font-size="20" font-weight="700" text-anchor="middle">${text}</text>`;
}

function card({
  W, H, date, rank, gamesBack, wins, losses, draws, winPct, remaining,
  probMedian, probLow, probHigh, forkLabel, forkUpPct, forkDownPct, story,
}) {
  const pad = 64;
  const heroSize = story ? 260 : 170;
  const heroY = story ? 470 : 330;
  const cellW = (W - pad * 2) / 3;
  const cellH = story ? 116 : 82;
  const gridTop = story ? 660 : 460;
  const cells = [
    ['순위', `${rank}위`, C.ink],
    ['5위 격차', `${gamesBack.toFixed(1)}G`, C.ink],
    ['잔여경기', `${remaining}`, C.ink],
    ['승', `${wins}`, C.win],
    ['패', `${losses}`, C.loss],
    ['승률', winPct, C.ink],
  ];
  const cellsSvg = cells.map(([label, value, color], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const cx = pad + col * cellW + cellW / 2;
    const cy = gridTop + row * cellH + cellH / 2;
    return `
      <text x="${cx}" y="${cy - (story ? 12 : 8)}" fill="${C.inkFaint}" font-family="${F_MONO}"
        font-size="${story ? 17 : 13}" text-anchor="middle" letter-spacing="0.04em">${label}</text>
      <text x="${cx}" y="${cy + (story ? 24 : 18)}" fill="${color}" font-family="${F_MONO}"
        font-size="${story ? 32 : 24}" font-weight="700" text-anchor="middle">${value}</text>`;
  }).join('');
  const gridLines = [1, 2].map((c) => {
    const x = pad + c * cellW;
    return `<line x1="${x}" y1="${gridTop}" x2="${x}" y2="${gridTop + cellH * 2}" stroke="${C.lineSoft}"/>`;
  }).join('') + `<line x1="${pad}" y1="${gridTop + cellH}" x2="${W - pad}" y2="${gridTop + cellH}" stroke="${C.lineSoft}"/>`;

  const forkTop = gridTop + cellH * 2 + (story ? 110 : 80);
  const forkH = story ? 220 : 110;
  const x0 = pad, x1 = W - pad - 300;
  const yMid = forkTop + forkH / 2, yUp = forkTop, yDown = forkTop + forkH;

  const footerY = story ? H - 140 : H - pad + 10;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="${story ? '27%' : '32%'}" r="70%">
      <stop offset="0%" stop-color="${C.eagle}" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="${C.eagle}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <text x="${pad}" y="${pad + 16}" fill="${C.eagle}" font-family="${F_MONO}" font-size="24"
    font-weight="600" letter-spacing="0.1em">🦅 HANWHA EAGLES NOW</text>
  <text x="${W - pad}" y="${pad + 16}" fill="${C.inkFaint}" font-family="${F_MONO}" font-size="21"
    text-anchor="end">${date} 기준</text>
  <line x1="${pad}" y1="${pad + 44}" x2="${W - pad}" y2="${pad + 44}" stroke="${C.line}"/>

  <text x="${W / 2}" y="${pad + 44 + (story ? 96 : 60)}" fill="${C.inkFaint}" font-family="${F_MONO}"
    font-size="24" text-anchor="middle">가을야구 확률</text>

  <text x="${W / 2}" y="${heroY}" fill="${C.eagle}" font-family="${F_BODY}" font-size="${heroSize}"
    font-weight="800" text-anchor="middle">${probMedian.toFixed(2)}%</text>
  <text x="${W / 2}" y="${heroY + (story ? 46 : 30)}" fill="${C.inkFaint}" font-family="${F_MONO}"
    font-size="22" text-anchor="middle">중앙값 · ${probLow.toFixed(2)}–${probHigh.toFixed(2)}% 구간</text>

  ${gridLines}
  <rect x="${pad + 0.5}" y="${gridTop + 0.5}" width="${W - pad * 2 - 1}" height="${cellH * 2 - 1}"
    fill="none" stroke="${C.lineSoft}"/>
  ${cellsSvg}

  <text x="${pad}" y="${forkTop - (story ? 40 : 26)}" fill="${C.inkFaint}" font-family="${F_MONO}"
    font-size="24" letter-spacing="0.06em">갈림길 · ${forkLabel}</text>

  <path d="M ${x0} ${yMid} C ${x0 + (x1 - x0) * 0.5} ${yMid}, ${x0 + (x1 - x0) * 0.5} ${yUp}, ${x1} ${yUp}"
    fill="none" stroke="${C.win}" stroke-width="4"/>
  <path d="M ${x0} ${yMid} C ${x0 + (x1 - x0) * 0.5} ${yMid}, ${x0 + (x1 - x0) * 0.5} ${yDown}, ${x1} ${yDown}"
    fill="none" stroke="${C.loss}" stroke-width="4"/>
  <circle cx="${x0}" cy="${yMid}" r="8" fill="${C.eagle}"/>
  <circle cx="${x1}" cy="${yUp}" r="7" fill="${C.win}"/>
  <circle cx="${x1}" cy="${yDown}" r="7" fill="${C.loss}"/>
  <text x="${x0 - 6}" y="${yMid + 32}" fill="${C.inkFaint}" font-family="${F_MONO}" font-size="18">오늘</text>
  ${pill(x1 + 20, yUp - 20, `▲ 3연승 · ${forkUpPct.toFixed(2)}%`, C.win, C.winWash)}
  ${pill(x1 + 20, yDown - 20, `▼ 3연패 · ${forkDownPct.toFixed(2)}%`, C.loss, C.lossWash)}

  <text x="${W / 2}" y="${yDown + (story ? 90 : 56)}" fill="${C.eagle}" font-family="${F_BODY}"
    font-size="${story ? 40 : 28}" font-weight="800" text-anchor="middle">가을야구, 아직 살아있다</text>

  <line x1="${W / 2 - 160}" y1="${footerY - 34}" x2="${W / 2 + 160}" y2="${footerY - 34}" stroke="${C.line}"/>
  <text x="${W / 2}" y="${footerY}" fill="${C.inkFaint}" font-family="${F_MONO}" font-size="20"
    text-anchor="middle">hanwhaeagles.kr · 비공식 팬 분석 프로젝트</text>
</svg>
`;
}

async function main() {
  const report = JSON.parse(await fs.readFile(REPORT_PATH, 'utf8'));
  const { summary, uncertainty, game_tree: gameTree, as_of: asOf } = report;

  const standings = await loadStandings(asOf);
  const opponents = [...new Set(gameTree.target_games.map((g) => g.opponent))];
  const forkLabel = `다음 ${opponents.join('·')} 3연전`;

  const winWin = walk(gameTree.tree, ['win', 'win', 'win']);
  const loseLose = walk(gameTree.tree, ['lose', 'lose', 'lose']);
  if (!winWin || !loseLose) {
    throw new Error('game_tree에 3연승/3연패 경로(win.win.win / lose.lose.lose)가 없습니다 — future_games가 3 미만이거나 트리 깊이가 부족한 경우로 보입니다.');
  }

  const shared = {
    date: asOf,
    rank: summary.most_likely_rank,
    gamesBack: standings.gamesBackFrom5th,
    wins: standings.wins,
    losses: standings.losses,
    draws: standings.draws,
    winPct: standings.win_rate.toFixed(4).replace(/^0/, ''),
    // KBO 정규시즌은 팀당 144경기. future_games(시뮬레이션 파라미터)를 쓰면 안 됨 —
    // 그건 "몇 경기를 시뮬레이션했는지"이지 "한화의 잔여 경기 수"가 아님.
    remaining: 144 - standings.games,
    probMedian: uncertainty.playoff_probability.median * 100,
    probLow: uncertainty.playoff_probability.p10 * 100,
    probHigh: uncertainty.playoff_probability.p90 * 100,
    forkLabel,
    forkUpPct: winWin.playoff_probability * 100,
    forkDownPct: loseLose.playoff_probability * 100,
  };

  await fs.writeFile(OUT_STORY, card({ W: 1080, H: 1920, story: true, ...shared }));
  await fs.writeFile(OUT_SQUARE, card({ W: 1080, H: 1080, story: false, ...shared }));

  console.log(`Wrote ${OUT_STORY} and ${OUT_SQUARE} — ${shared.rank}위, PS ${shared.probMedian.toFixed(2)}% (${shared.date} 기준)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
