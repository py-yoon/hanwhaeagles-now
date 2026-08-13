import { normalizeTeamName } from '../normalize/kbo.js';

function text(value) {
  return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Parses innings notation like "920 2/3" (KBO writes fractional outs as thirds) into a decimal. */
export function parseInnings(value) {
  const s = text(value);
  const m = s.match(/^(\d+)(?:\s+(\d)\/3)?$/);
  if (!m) { const n = Number(s); return Number.isFinite(n) ? n : 0; }
  return Number(m[1]) + (m[2] ? Number(m[2]) / 3 : 0);
}

/**
 * Generic parser for KBO's `Record/Team/{Hitter,Pitcher}/BasicN.aspx` tables. Every stat cell
 * carries a stable `data-id` (e.g. HRA_RT, PA_CN, ERA_RT) regardless of column order, so rows
 * are parsed into a { [data_id]: text } map instead of relying on column position.
 */
export function parseTeamStatTable(html) {
  const rows = [...String(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]);
  const out = [];
  for (const row of rows) {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)];
    if (cells.length < 3) continue;
    const rank = text(cells[0][1]);
    if (!/^\d+$/.test(rank)) continue;
    const team = normalizeTeamName(text(cells[1][1]));
    const stats = {};
    for (const m of row.matchAll(/<td[^>]*data-id="([^"]+)"[^>]*>([\s\S]*?)<\/td>/gi)) {
      stats[m[1]] = text(m[2]);
    }
    out.push({ rank: Number(rank), team, ...stats });
  }
  return out;
}

function num(v, d = 0) { const n = Number(v); return Number.isFinite(n) ? n : d; }

/** Merges the three team-level stat tables into the {team: {batter, pitcher}} shape that
 * player-features.js's teamFeatureVector() expects. */
export function mergeTeamStats(hitterBasic1, hitterBasic2, pitcherBasic1) {
  const h2ByTeam = new Map(hitterBasic2.map((r) => [r.team, r]));
  const pByTeam = new Map(pitcherBasic1.map((r) => [r.team, r]));
  const out = {};
  for (const h1 of hitterBasic1) {
    const h2 = h2ByTeam.get(h1.team) ?? {};
    const p = pByTeam.get(h1.team);
    const pa = num(h1.PA_CN);
    const ip = p ? parseInnings(p.INN2_CN) : 0;
    out[h1.team] = {
      batter: {
        pa,
        avg: num(h1.HRA_RT),
        ops: num(h2.OPS_RT),
        hr_rate: pa > 0 ? num(h1.HR_CN) / pa : 0,
        bb_rate: pa > 0 ? num(h2.BB_CN) / pa : 0,
        so_rate: pa > 0 ? num(h2.KK_CN) / pa : 0,
      },
      pitcher: p ? {
        ip,
        era: num(p.ERA_RT),
        whip: num(p.WHIP_RT),
        k9: ip > 0 ? (num(p.KK_CN) / ip) * 9 : 0,
        bb9: ip > 0 ? (num(p.BB_CN) / ip) * 9 : 0,
        hr9: ip > 0 ? (num(p.HR_CN) / ip) * 9 : 0,
      } : null,
    };
  }
  return out;
}
