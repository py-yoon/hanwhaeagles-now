import fs from 'node:fs/promises';

const SEASON = 2026;
const TEAM = 'HANWHA';
const BOX_SCORES_PATH = `data/raw/box-scores-${SEASON}.json`;
const OUT_PATH = `docs/players-season-${SEASON}.js`;

function num(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function rate(a, b, digits = 3) {
  if (!b) return 0;
  return Number((a / b).toFixed(digits));
}

function nameFromPlayerId(playerId) {
  const idx = playerId.indexOf('-');
  return idx === -1 ? playerId : playerId.slice(idx + 1);
}

// KBO's hitter box score table only reports AB/H/RBI as real per-game counting stats (see
// the comment on parseHitterEntry in src/collector/box-score-parser.js — R is parsed there
// but dropped before parseBoxScoreResponse stores the row) — 2B/3B/HR/BB/HBP/SO/SB/CS/TB
// are NOT collected and always arrive as 0, so summing them would silently fabricate stats
// (e.g. OBP/SLG/OPS would misleadingly collapse toward AVG). Only aggregate real fields.
function emptyBatting() {
  return { G: new Set(), AB: 0, H: 0, RBI: 0 };
}

// KBO's pitcher box score table reports 4사구 (BB+HBP) as a single combined column — this
// pipeline folds HBP into BB rather than guessing a split (see parsePitcherEntry in
// src/collector/box-score-parser.js), so the BB below is really "walks + hit-by-pitch".
function emptyPitching() {
  return { G: 0, IP: 0, H: 0, HR: 0, BB: 0, SO: 0, R: 0, ER: 0, W: 0, L: 0, SV: 0, HLD: 0 };
}

function addBatting(agg, row, gameId) {
  agg.G.add(gameId);
  agg.AB += num(row.AB);
  agg.H += num(row.H);
  agg.RBI += num(row.RBI);
}

function addPitching(agg, row) {
  agg.G += 1;
  agg.IP += num(row.IP);
  agg.H += num(row.H);
  agg.HR += num(row.HR);
  agg.BB += num(row.BB);
  agg.SO += num(row.SO);
  agg.R += num(row.R);
  agg.ER += num(row.ER);
  agg.W += num(row.W);
  agg.L += num(row.L);
  agg.SV += num(row.SV);
  agg.HLD += num(row.HLD);
}

function finalizeBatting(agg) {
  const { AB, H, RBI } = agg;
  return { G: agg.G.size, AB, H, RBI, avg: rate(H, AB) };
}

// KBO writes innings pitched in outs-based notation (".1" = one out, ".2" = two outs), not
// decimal tenths — parseInnings already converts that to a true decimal (5⅓ → 5.333) for
// arithmetic, so this converts back to outs-notation only for display.
function formatIpDisplay(ipDecimal) {
  const outs = Math.round(ipDecimal * 3);
  return `${Math.floor(outs / 3)}.${outs % 3}`;
}

function finalizePitching(agg) {
  const { G, IP, H, HR, BB, SO, R, ER, W, L, SV, HLD } = agg;
  return {
    G, ip: formatIpDisplay(IP), H, HR, BB, SO, R, ER, W, L, SV, HLD,
    era: IP > 0 ? Number(((ER / IP) * 9).toFixed(2)) : null,
    whip: IP > 0 ? Number(((H + BB) / IP).toFixed(2)) : null,
    k9: IP > 0 ? Number(((SO / IP) * 9).toFixed(2)) : null,
  };
}

export function buildSeasonStats(boxScorePayload, { team = TEAM } = {}) {
  const games = boxScorePayload.boxScoresByGameId ?? {};
  const batting = new Map();
  const pitching = new Map();

  for (const game of Object.values(games)) {
    for (const row of game.battingRows ?? []) {
      if (row.team !== team) continue;
      const name = nameFromPlayerId(row.player_id);
      if (!batting.has(name)) batting.set(name, emptyBatting());
      addBatting(batting.get(name), row, game.game_id);
    }
    for (const row of game.pitchingRows ?? []) {
      if (row.team !== team) continue;
      const name = nameFromPlayerId(row.player_id);
      if (!pitching.has(name)) pitching.set(name, emptyPitching());
      addPitching(pitching.get(name), row);
    }
  }

  const players = new Set([...batting.keys(), ...pitching.keys()]);
  const result = {};
  for (const name of players) {
    result[name] = {
      batting: batting.has(name) ? finalizeBatting(batting.get(name)) : null,
      pitching: pitching.has(name) ? finalizePitching(pitching.get(name)) : null,
    };
  }
  return result;
}

async function main() {
  const raw = JSON.parse(await fs.readFile(BOX_SCORES_PATH, 'utf8'));
  const stats = buildSeasonStats(raw);
  const payload = {
    meta: { season: SEASON, team: TEAM, generated: new Date().toISOString().slice(0, 10), source: `${BOX_SCORES_PATH} (수집된 박스스코어 합산)` },
    players: stats,
  };
  const js = `window.EAGLES_SEASON_${SEASON} = ${JSON.stringify(payload, null, 2)};\n`;
  await fs.writeFile(OUT_PATH, js);
  console.log(`Wrote ${OUT_PATH} — ${Object.keys(stats).length} players`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
