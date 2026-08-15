// Builds docs/scenario-data.js — the real current record, real remaining schedule, and
// current playoff probability that scenario.html (가을야구 시나리오 계산기) runs on, so the
// calculator tracks the nightly refresh instead of shipping a one-time hardcoded snapshot.
import fs from 'node:fs/promises';

const SEASON = 2026;
const TEAM = 'HANWHA';
const GAMES_PATH = `data/raw/production-${SEASON}.json`;
const REPORT_PATH = 'data/live/latest-report.json';
const OUT_PATH = 'docs/scenario-data.js';

const STADIUM_BY_HOME_TEAM = {
  HANWHA: '대전', KIA: '광주', LG: '잠실', DOOSAN: '잠실', KT: '수원',
  SSG: '문학', NC: '창원', LOTTE: '사직', SAMSUNG: '대구', KIWOOM: '고척',
};

const TEAM_NAME = {
  HANWHA: '한화', KIWOOM: '키움', KT: 'KT', LG: 'LG', KIA: 'KIA',
  DOOSAN: '두산', NC: 'NC', LOTTE: '롯데', SSG: 'SSG', SAMSUNG: '삼성',
};

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
  const games = gamesPayload.games ?? [];
  const teamGames = games.filter((g) => g.home === TEAM || g.away === TEAM);

  let wins = 0, losses = 0, draws = 0;
  for (const g of teamGames) {
    if (String(g.status).toUpperCase() !== 'FINAL') continue;
    const result = resultFor(g);
    if (result === 'WIN') wins++; else if (result === 'LOSS') losses++; else draws++;
  }

  const remainingGames = teamGames
    .filter((g) => String(g.status).toUpperCase() === 'SCHEDULED')
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.game_id).localeCompare(String(b.game_id)))
    .map((g, idx) => {
      const isHome = g.home === TEAM;
      const opponent = isHome ? g.away : g.home;
      return {
        id: idx + 1,
        date: g.date,
        opponent,
        opponentName: TEAM_NAME[opponent] || opponent,
        isHome,
        stadium: g.stadium || STADIUM_BY_HOME_TEAM[isHome ? TEAM : opponent] || '',
      };
    });

  let playoffProbability = null;
  let asOf = gamesPayload.season ? `${gamesPayload.season}` : null;
  try {
    const report = JSON.parse(await fs.readFile(REPORT_PATH, 'utf8'));
    playoffProbability = Math.round(report.summary.playoff_probability * 10000) / 100; // %
    asOf = report.as_of;
  } catch {
    console.log(`[scenario-data] no report at ${REPORT_PATH} — playoffProbability left null`);
  }

  const payload = {
    meta: {
      season: SEASON,
      team: TEAM,
      generated: new Date().toISOString().slice(0, 10),
      asOf,
      source: `${GAMES_PATH} + ${REPORT_PATH}`,
    },
    record: { wins, losses, draws, games: wins + losses + draws },
    remainingCount: remainingGames.length,
    playoffProbability,
    remainingGames,
  };

  const js = `window.EAGLES_SCENARIO_${SEASON} = ${JSON.stringify(payload, null, 2)};\n`;
  await fs.writeFile(OUT_PATH, js);
  console.log(`Wrote ${OUT_PATH} — record ${wins}W ${losses}L ${draws}D, ${remainingGames.length} remaining games, PS prob ${playoffProbability}%`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
