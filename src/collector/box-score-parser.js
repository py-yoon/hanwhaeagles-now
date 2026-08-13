import { normalizeTeamName } from '../normalize/kbo.js';
import { parseInnings } from './team-stats-parser.js';

function num(v, d = 0) { const n = Number(v); return Number.isFinite(n) ? n : d; }

function cellsOf(tableJson) {
  return tableJson.rows.map((r) => r.row.map((c) => c.Text));
}

/**
 * Parses one team's `arrHitter[i]` entry from `GetBoxScoreScroll` into per-player rows for
 * this game.
 *
 * KBO's hitter box score only exposes AB/H/RBI/R as this-game counting stats (`table3`,
 * columns 타수/안타/타점/득점) plus a season-cumulative AVG for display, which this drops.
 * There is no column for 2B/3B/HR/BB/HBP/SO/SB/CS/TB/SF — those only exist as free-text
 * per-at-bat play descriptions in `table2` (e.g. "2루타", "볼넷"), which this deliberately
 * does not parse: KBO's play descriptions have many variants (우안/좌안/중안 singles,
 * 병살타, 희생플라이, 실책출루, ...) and a misclassification would silently inject a wrong
 * stat into training data, which Rule 1/Rule 5 in DEVELOPMENT_STATUS.md forbid. Concretely
 * this means AVG (H/AB) computed from these rows is real, but OPS is not obtainable from
 * this signal alone (SLG collapses toward AVG since extra bases are invisible, and OBP
 * ignores walks/HBP).
 */
export function parseHitterEntry(entry) {
  const info = cellsOf(JSON.parse(entry.table1)); // [order, position, name]
  const box = cellsOf(JSON.parse(entry.table3)); // [AB, H, RBI, R, season_AVG]
  return info.map((row, i) => {
    const [AB, H, RBI, R] = box[i].map((v) => num(v));
    return { player_name: row[2], position: row[1], AB, H, RBI, R };
  });
}

/**
 * Parses one team's `arrPitcher[i]` entry into per-pitcher rows for this game.
 *
 * Columns (confirmed against the live page's `<thead>`, 2026-08):
 * 선수명,등판,결과,승,패,세,이닝,타자,투구수,타수,피안타,홈런,4사구,삼진,실점,자책,평균자책점
 * `승`/`패`/`세`/`평균자책점` are season-to-date, not this-game — this-game decisions come
 * from `결과` instead. `4사구` is BB+HBP combined; KBO does not split them in this table, so
 * every row's BB folds in HBP (HBP is reported as 0, not omitted, to keep the row shape
 * consistent with `PITCHER_FIELDS`).
 */
export function parsePitcherEntry(entry) {
  const rows = cellsOf(JSON.parse(entry.table));
  return rows.map((r) => {
    const [name, role, decision, , , , ip, tbf, np, ab, h, hr, bbhbp, so, runs, er] = r;
    const d = String(decision ?? '').replace(/&nbsp;/g, '').trim();
    return {
      player_name: name,
      role,
      IP: parseInnings(ip),
      TBF: num(tbf), NP: num(np), AB_against: num(ab),
      H: num(h), HR: num(hr), BB: num(bbhbp), HBP: 0, SO: num(so),
      R: num(runs), ER: num(er),
      W: d === '승' ? 1 : 0, L: d === '패' ? 1 : 0, SV: d === '세' ? 1 : 0, HLD: d === '홀드' ? 1 : 0,
    };
  });
}

/**
 * Parses a full `GetBoxScoreScroll` response into per-player-per-game rows, shaped for
 * `normalizePlayerStatRow`/`aggregateTeamPlayerStats` in src/model/player-features.js.
 *
 * `GetBoxScoreScroll`'s own JSON has no game/team identity fields at all (no G_ID, no
 * HOME_NM/AWAY_NM) — that metadata lives only in the sibling `GetScoreBoardScroll` endpoint,
 * confirmed by fetching both separately and diffing their top-level keys. Rather than making
 * every caller also fetch GetScoreBoardScroll just to learn which team is which, this takes
 * `gameId`/`asOf`/`homeTeam`/`awayTeam` from the caller, who already has them from the
 * schedule collector's own game records (src/collector/parser.js's `{game_id, date, home,
 * away}`). `arrHitter`/`arrPitcher` are always `[away, home]` order (verified against a live
 * response where arrHitter[0] contained the visiting team's real lineup).
 */
export function parseBoxScoreResponse(raw, { gameId, asOf, homeTeam, awayTeam }) {
  if (!gameId || !asOf || !homeTeam || !awayTeam) {
    throw new Error('parseBoxScoreResponse: gameId, asOf, homeTeam, and awayTeam are all required (GetBoxScoreScroll does not report them itself)');
  }
  const away = normalizeTeamName(awayTeam);
  const home = normalizeTeamName(homeTeam);
  const teams = [away, home];
  const as_of = String(asOf);
  const game_id = String(gameId);

  const battingRows = [];
  const pitchingRows = [];
  raw.arrHitter.forEach((entry, i) => {
    const team = teams[i];
    for (const h of parseHitterEntry(entry)) {
      battingRows.push({
        player_id: `${team}-${h.player_name}`, team, as_of, game_id,
        PA: 0, AB: h.AB, H: h.H, '2B': 0, '3B': 0, HR: 0, RBI: h.RBI, BB: 0, HBP: 0, SO: 0, SB: 0, CS: 0, TB: 0, SF: 0,
      });
    }
  });
  raw.arrPitcher.forEach((entry, i) => {
    const team = teams[i];
    for (const p of parsePitcherEntry(entry)) {
      pitchingRows.push({
        player_id: `${team}-${p.player_name}`, team, as_of, game_id,
        G: 1, IP: p.IP, H: p.H, HR: p.HR, BB: p.BB, HBP: p.HBP, SO: p.SO, R: p.R, ER: p.ER,
        TBF: p.TBF, NP: p.NP, W: p.W, L: p.L, SV: p.SV, HLD: p.HLD,
      });
    }
  });
  return { game_id, as_of, home_team: home, away_team: away, battingRows, pitchingRows };
}
