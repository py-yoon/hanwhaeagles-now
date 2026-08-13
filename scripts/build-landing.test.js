import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLandingHtml } from './build-landing.js';

const TEMPLATE = '<html>{{AS_OF}} {{RANK}} {{GB}} {{WINS}}-{{LOSSES}}-{{DRAWS}} {{WIN_RATE}} {{REMAINING}} {{GAMES_COLLECTED}} {{RECONCILE_CHECKS}} {{PLAYOFF_PCT}} {{MEDIAN_PCT}} {{P10_PCT}} {{P90_PCT}} <div id="ladder">{{LADDER_HTML}}</div> <div id="games">{{GAMES_HTML}}</div> <table>{{STANDINGS_HTML}}</table></html>';

const report = {
  as_of: '2026-08-12',
  future_games: 80,
  summary: { playoff_probability: 0.0527 },
  uncertainty: { playoff_probability: { median: 0.0488, p10: 0.0455, p90: 0.0506 } },
  rank_distribution: [
    { rank: 5, probability: 0.0452 },
    { rank: 6, probability: 0.8198 },
    { rank: 7, probability: 0.1199 },
  ],
  important_games: [
    { game_id: '20260813-HANWHA-DOOSAN-1', impact_range: 0.0744 },
    { game_id: '20260818-KIA-HANWHA-1', impact_range: 0.0564 },
  ],
};

const focusRow = { team: 'HANWHA', rank: 6, wins: 48, losses: 50, draws: 3 };
const refRow = { team: 'DOOSAN', rank: 5, wins: 55, losses: 44, draws: 2 };
const allRows = [
  { team: 'KT', rank: 1, wins: 60, losses: 37, draws: 2 },
  { team: 'SAMSUNG', rank: 2, wins: 59, losses: 41, draws: 2 },
  { team: 'LG', rank: 3, wins: 56, losses: 46, draws: 1 },
  { team: 'KIA', rank: 4, wins: 54, losses: 46, draws: 2 },
  refRow,
  focusRow,
  { team: 'NC', rank: 7, wins: 44, losses: 51, draws: 2 },
  { team: 'LOTTE', rank: 8, wins: 44, losses: 56, draws: 2 },
  { team: 'SSG', rank: 9, wins: 41, losses: 60, draws: 4 },
  { team: 'KIWOOM', rank: 10, wins: 39, losses: 65, draws: 2 },
];

test('fills every token and leaves none unresolved', () => {
  const html = buildLandingHtml({ template: TEMPLATE, report, focusRow, refRow, allRows, gamesCollected: 645, officialCount: 1 });
  assert.doesNotMatch(html, /\{\{[A-Z_]+\}\}/);
  assert.match(html, /2026-08-12/);
  assert.match(html, />6</);
});

test('games-behind is computed from the reference (cutoff) row, not hardcoded', () => {
  const html = buildLandingHtml({ template: TEMPLATE, report, focusRow, refRow, allRows, gamesCollected: 645, officialCount: 1 });
  // (55-48 + 50-44)/2 = (7+6)/2 = 6.5
  assert.match(html, /6\.5/);
});

test('a team already inside the playoff line shows 0.0 games behind, not a negative number', () => {
  const insideRow = { team: 'HANWHA', rank: 3, wins: 60, losses: 40, draws: 2 };
  const html = buildLandingHtml({ template: TEMPLATE, report, focusRow: insideRow, refRow, gamesCollected: 645, officialCount: 1 });
  assert.match(html, / 0\.0 /);
});

test('ladder marks the current rank distinctly and inserts the playoff cutoff after rank 5', () => {
  const html = buildLandingHtml({ template: TEMPLATE, report, focusRow, refRow, allRows, gamesCollected: 645, officialCount: 1 });
  assert.match(html, /class="rung now" data-pct="81\.98"/);
  assert.match(html, /cutoff/);
});

test('important games render in impact order with a matchup label', () => {
  const html = buildLandingHtml({ template: TEMPLATE, report, focusRow, refRow, allRows, gamesCollected: 645, officialCount: 1 });
  const doosanIdx = html.indexOf('DOOSAN');
  const kiaIdx = html.indexOf('KIA');
  assert.ok(doosanIdx > -1 && kiaIdx > -1 && doosanIdx < kiaIdx);
  assert.match(html, /8월 13일/);
});

test('standings table lists all 10 teams, highlights the focus team, and marks the playoff cutoff', () => {
  const html = buildLandingHtml({ template: TEMPLATE, report, focusRow, refRow, allRows, gamesCollected: 645, officialCount: 1 });
  for (const row of allRows) assert.ok(html.includes(`<td>${row.team}</td>`), `missing ${row.team}`);
  assert.match(html, /<tr class="me">/);
  assert.match(html, /cutoff-row/);
});

test('standings games-behind is relative to the league leader, not the focus team', () => {
  const html = buildLandingHtml({ template: TEMPLATE, report, focusRow, refRow, allRows, gamesCollected: 645, officialCount: 1 });
  // KT (1st, 60-37) vs HANWHA (48-50): (60-48 + 50-37)/2 = (12+13)/2 = 12.5
  assert.match(html, />12\.5</);
});

test('throws instead of silently publishing when required data is missing', () => {
  assert.throws(() => buildLandingHtml({ template: TEMPLATE, report: null, focusRow, refRow }));
});
