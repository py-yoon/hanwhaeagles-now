// Daily production refresh: collect real KBO data, run the gated pipeline, and (only on a
// PASS) rebuild the public landing page. Never touches docs/index.html on a BLOCKED/ERROR
// result — a bad run should fail the CI job and leave yesterday's page live, not publish
// broken or stale-looking data.
import fs from 'node:fs/promises';
import path from 'node:path';

import { collectMonth } from '../src/collector/kbo.js';
import { collectDailyStandings } from '../src/collector/daily-standings.js';
import { KBO_TEAMS } from '../src/collector/standings-reconciliation.js';
import { runProductionCliPipeline } from '../src/cli/pipeline-run.js';
import { buildLandingHtml } from './build-landing.js';

const FOCUS_TEAM = 'HANWHA';
const RAW_DIR = 'data/raw';
const LIVE_DIR = 'data/live';

function kstToday() {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000); // UTC -> KST
  return now.toISOString().slice(0, 10);
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

async function main() {
  const asOf = process.env.AS_OF_OVERRIDE ?? kstToday();
  const season = Number(asOf.slice(0, 4));
  // The KBO schedule page publishes the whole regular season (through October) in
  // advance, so collecting only through the current month silently dropped every
  // still-SCHEDULED game after "today" from the simulation — future_games and every
  // team's own remaining-game count were being computed against a truncated season
  // that effectively ended in the current month, not the real one.
  const SEASON_END_MONTH = 10;
  const months = [];
  for (let m = 3; m <= SEASON_END_MONTH; m++) months.push(m);

  console.log(`[refresh] as_of=${asOf} season=${season} months=${months.join(',')}`);

  console.log('[refresh] collecting schedule...');
  const games = [];
  for (const month of months) {
    let monthGames;
    try {
      monthGames = await collectMonth({ season, month });
    } catch (err) {
      // collectMonth throws when the schedule table has zero rows, which is also
      // exactly what an empty post-season month (the regular season doesn't always
      // run all the way through October) looks like. Months are walked in order, so
      // once we hit one, every later month is empty too — stop instead of failing
      // the whole refresh over a real end-of-season month.
      if (/returned zero games/.test(err.message)) {
        console.log(`[refresh]   ${season}-${String(month).padStart(2, '0')}: 0 games — treating as end of season, stopping collection`);
        break;
      }
      throw err;
    }
    console.log(`[refresh]   ${season}-${String(month).padStart(2, '0')}: ${monthGames.length} games`);
    games.push(...monthGames);
  }

  console.log('[refresh] collecting official standings...');
  const standingsRows = await collectDailyStandings({ date: asOf });
  const officialStandings = standingsRows.map((r) => ({
    rank: r.rank, team: r.team, games: r.games, wins: r.wins, losses: r.losses,
    draws: r.draws, win_rate: r.win_rate, games_behind: r.games_behind,
  }));

  const gamesFile = path.join(RAW_DIR, `production-${season}.json`);
  const officialFile = path.join(RAW_DIR, `official-${asOf}.json`);
  await writeJson(gamesFile, {
    season,
    initial_standings: KBO_TEAMS.map((t) => ({ team: t, wins: 0, losses: 0, draws: 0 })),
    games,
  });
  await writeJson(officialFile, { date: asOf, source: 'KBO TeamRankDaily (live)', official_standings: officialStandings });

  console.log('[refresh] running production pipeline...');
  const result = await runProductionCliPipeline({
    asOf,
    gamesFile,
    officialFiles: [officialFile],
    sourceStatus: 'live',
    iterations: 100000,
    focusTeam: FOCUS_TEAM,
  });

  if (result.status !== 'PASS') {
    console.error(`[refresh] BLOCKED at stage=${result.stage}: ${result.reason}`);
    process.exitCode = 1;
    return;
  }

  console.log(`[refresh] PASS — playoff_probability=${result.report.summary.playoff_probability}`);

  await writeJson(path.join(LIVE_DIR, 'latest-report.json'), result.report);

  const template = await fs.readFile('templates/landing.html', 'utf8');
  const standingsRowsRanked = result.artifacts.standings.standings;
  const focusRow = standingsRowsRanked.find((r) => r.team === FOCUS_TEAM);
  const refRow = standingsRowsRanked.find((r) => r.rank === 5) ?? standingsRowsRanked[4];
  if (!focusRow) throw new Error(`${FOCUS_TEAM} not found in standings`);

  const html = buildLandingHtml({
    template,
    report: result.report,
    focusRow,
    refRow,
    allRows: standingsRowsRanked,
    gamesCollected: games.length,
    officialCount: 1,
  });

  await fs.mkdir('docs', { recursive: true });
  await fs.writeFile('docs/index.html', html);
  await fs.writeFile('docs/.nojekyll', '');
  console.log('[refresh] wrote docs/index.html');
}

main().catch((err) => {
  console.error('[refresh] ERROR', err);
  process.exitCode = 1;
});
