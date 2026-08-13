import { applyGames, rankTeams } from '../engine/standings.js';
import { normalizeGameStatus } from './live-ingest.js';
import { compareOfficialSnapshot } from '../verifier/official.js';

export const KBO_TEAMS = Object.freeze([
  'HANWHA','DOOSAN','LG','KT','SAMSUNG','KIA','NC','LOTTE','SSG','KIWOOM'
]);

function emptyStandings(teams = KBO_TEAMS) {
  return teams.map(team => ({ team, wins: 0, losses: 0, draws: 0 }));
}

export function calculateStandingsFromGames(games, { asOfDate, teams = KBO_TEAMS, initialStandings } = {}) {
  if (!asOfDate || !/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) throw new Error(`Invalid asOfDate: ${asOfDate}`);
  const finalGames = games
    .filter(g => String(g.date) <= asOfDate && normalizeGameStatus(g) === 'FINAL')
    .sort((a,b) => String(a.date).localeCompare(String(b.date)) || String(a.game_id).localeCompare(String(b.game_id)));
  const base = initialStandings ? initialStandings.map(t => ({...t})) : emptyStandings(teams);
  const calculated = rankTeams(applyGames(base, finalGames));
  return { as_of_date: asOfDate, games_processed: finalGames.length, standings: calculated };
}

export function reconcileOfficialStandings({ games, official, asOfDate, teams = KBO_TEAMS, initialStandings } = {}) {
  if (!Array.isArray(games) || !Array.isArray(official)) throw new Error('games and official must be arrays');
  const date = asOfDate ?? official[0]?.date;
  const calc = calculateStandingsFromGames(games, { asOfDate: date, teams, initialStandings });
  const comparison = compareOfficialSnapshot(calc.standings, official);
  const officialGames = official.reduce((sum, row) => sum + Number(row.games || 0), 0) / 2;
  const gameCountMismatch = Number.isFinite(officialGames) && officialGames !== calc.games_processed;
  const mismatches = [...comparison.mismatches];
  if (gameCountMismatch) mismatches.push({
    reason: 'GAME_COUNT_MISMATCH', calculated_games: calc.games_processed, official_games: officialGames
  });
  return {
    status: mismatches.length ? 'FAIL' : 'PASS',
    as_of_date: date,
    games_processed: calc.games_processed,
    official_games: officialGames,
    teams_checked: official.length,
    mismatches,
    calculated: calc.standings,
    official,
  };
}

export function reconcileOfficialTimeline({ games, snapshots, teams = KBO_TEAMS, initialStandings } = {}) {
  if (!Array.isArray(snapshots)) throw new Error('snapshots must be an array');
  const results = snapshots
    .slice()
    .sort((a,b) => String(a.date).localeCompare(String(b.date)))
    .map(snapshot => ({
      date: snapshot.date,
      result: reconcileOfficialStandings({
        games,
        official: snapshot.official_standings ?? snapshot.rows ?? [],
        asOfDate: snapshot.date,
        teams,
        initialStandings,
      })
    }));
  const failures = results.filter(x => x.result.status !== 'PASS');
  return { status: failures.length ? 'FAIL' : 'PASS', snapshots_checked: results.length, failures, results };
}
