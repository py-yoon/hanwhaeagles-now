import { buildStrengthParts, predictIntegrated, DEFAULT_WEIGHTS } from './integrated-prediction.js';

const FINAL = new Set(['FINAL','FINISHED']);
const FUTURE = new Set(['SCHEDULED','POSTPONED','RESCHEDULED']);
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;

export function normalizeTeamSnapshot(snapshot={}) {
  return buildStrengthParts({
    elo:n(snapshot.elo), roster:n(snapshot.roster), starter:n(snapshot.starter),
    bullpen:n(snapshot.bullpen), offense:n(snapshot.offense), defense:n(snapshot.defense),
    recent:n(snapshot.recent)
  });
}

export function forecastGame(game, snapshots={}, options={}) {
  if (!game?.home || !game?.away) throw new Error('game requires home and away');
  const status=String(game.status||'').toUpperCase();
  if (FINAL.has(status)) return {status:'SKIPPED_FINAL',game_id:game.game_id};
  if (!FUTURE.has(status)) return {status:'SKIPPED_NON_FUTURE',game_id:game.game_id};
  const home=normalizeTeamSnapshot(snapshots[game.home]||{});
  const away=normalizeTeamSnapshot(snapshots[game.away]||{});
  const result=game.probabilities ? {probabilities:game.probabilities,home_score:0,away_score:0,differential:0} : predictIntegrated(home,away,{weights:{...DEFAULT_WEIGHTS,...(options.weights||{})}});
  return {status:'FORECAST',game_id:game.game_id,date:game.date,home:game.home,away:game.away,
    probabilities:result.probabilities,home_score:result.home_score,away_score:result.away_score,
    differential:result.differential,inputs:{home,away}};
}

export function forecastSchedule(games=[],snapshots={},options={}) {
  return games.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.game_id).localeCompare(String(b.game_id)))
    .map(g=>forecastGame(g,snapshots,options)).filter(x=>x.status==='FORECAST');
}
