import { forecastGame } from './game-forecast.js';

const CONFIRMED = new Set(['CONFIRMED','FINAL','LOCKED','ANNOUNCED']);
const UNKNOWN = new Set(['UNKNOWN','UNCONFIRMED','TBD','']);
const iso = v => v ? new Date(v).toISOString() : null;

function cutoffTime(asOf) {
  if (!asOf) return Infinity;
  const t = new Date(asOf).getTime();
  return Number.isFinite(t) ? t : NaN;
}

function validEffectiveAt(value, cutoff) {
  if (!value) return true;
  const t = new Date(value).getTime();
  return Number.isFinite(t) && t <= cutoff;
}

/**
 * Apply the latest known starting-pitcher announcement to a pregame snapshot.
 * Events after asOf are ignored to prevent look-ahead leakage.
 */
export function resolvePregameStarter(game, baseSnapshots={}, starterEvents=[], asOf=game?.date) {
  const cutoff = cutoffTime(asOf);
  if (!game?.home || !game?.away) throw new Error('game requires home and away');
  if (!Number.isFinite(cutoff)) throw new Error('invalid asOf');

  const relevant = starterEvents
    .filter(e => e?.game_id === game.game_id)
    .filter(e => validEffectiveAt(e.effective_at ?? e.published_at, cutoff))
    .sort((a,b) => new Date(a.effective_at ?? a.published_at ?? 0) - new Date(b.effective_at ?? b.published_at ?? 0));

  const latest = {home:null, away:null};
  for (const e of relevant) {
    const status = String(e.status ?? '').toUpperCase();
    if (!CONFIRMED.has(status)) continue;
    if (e.team === game.home) latest.home = e;
    if (e.team === game.away) latest.away = e;
  }

  const home = {...(baseSnapshots[game.home] ?? {})};
  const away = {...(baseSnapshots[game.away] ?? {})};
  const applied = [];
  for (const [team, target] of [[game.home,home],[game.away,away]]) {
    const event = latest[team === game.home ? 'home' : 'away'];
    if (!event) continue;
    if (event.strength !== undefined && Number.isFinite(Number(event.strength))) {
      target.starter = Number(event.strength);
      applied.push({team, player_id:event.player_id ?? null, player:event.player ?? null, effective_at:iso(event.effective_at ?? event.published_at), source:event.source ?? null});
    }
  }

  return {snapshots:{[game.home]:home,[game.away]:away}, applied, latestKnown: {home:latest.home, away:latest.away}};
}

/**
 * Recalculate a forecast whenever a valid confirmed starter update arrives.
 */
export function updatePregameForecast(game, baseSnapshots, starterEvents=[], options={}) {
  const asOf = options.asOf ?? game.date;
  const resolved = resolvePregameStarter(game, baseSnapshots, starterEvents, asOf);
  const forecast = forecastGame(game, resolved.snapshots, options);
  return {
    ...forecast,
    as_of: asOf,
    starter_updates_applied: resolved.applied,
    update_count: resolved.applied.length,
    forecast_revision: resolved.applied.length ? 'STARTER_UPDATED' : 'BASELINE'
  };
}

export function shouldReforecast(previous, next) {
  if (!previous || !next) return true;
  const a = previous.starter_updates_applied ?? [];
  const b = next.starter_updates_applied ?? [];
  return JSON.stringify(a) !== JSON.stringify(b);
}
