import { runIntegratedMonteCarlo } from './integrated-monte-carlo.js';

export function estimateGameImportance({base, gameId, iterations=20000, seed=20260812}={}) {
  if (!base?.standings || !base?.games || !base?.snapshots) throw new Error('base simulation inputs required');
  const game = base.games.find(g=>g.game_id===gameId);
  if (!game) throw new Error(`game not found: ${gameId}`);
  const focus = base.focusTeam ?? 'HANWHA';
  const run = (forced, offset) => {
    const games = base.games.map(g=>g.game_id===gameId ? {...g,status:'SCHEDULED',forced_result:forced} : g);
    const original = base.snapshots;
    // Force only this game by replacing its probability with a degenerate distribution downstream.
    const r = runIntegratedMonteCarlo({...base,games,iterations,seed:seed+offset,asOf:base.asOf});
    return r;
  };
  // Use a deterministic conditional simulation directly from the base forecasts.
  const forecasts = base.forecasts ?? runIntegratedMonteCarlo({...base,iterations:Math.max(1000,Math.min(iterations,5000)),seed}).forecasts;
  const f = forecasts.find(x=>x.game_id===gameId);
  if (!f) throw new Error(`forecast not found: ${gameId}`);
  const probs=f.probabilities;
  const basePS=Number(base.playoff_probability ?? 0);
  const outcomes=[['HOME_WIN',probs.HOME_WIN],['DRAW',probs.DRAW],['AWAY_WIN',probs.AWAY_WIN]];
  // Conditional approximation: re-run with the selected outcome forced via a one-game override.
  const conditional=[];
  for (let i=0;i<outcomes.length;i++) {
    const [outcome,p]=outcomes[i];
    const forcedGames=base.games.map(g=>g.game_id===gameId?{...g,status:'SCHEDULED',probabilities:{HOME_WIN:outcome==='HOME_WIN'?1:0,DRAW:outcome==='DRAW'?1:0,AWAY_WIN:outcome==='AWAY_WIN'?1:0}}:g);
    const r=runIntegratedMonteCarlo({...base,games:forcedGames,iterations,seed:seed+i+1});
    conditional.push({outcome,prior_probability:Number(p.toFixed(6)),playoff_probability:r.playoff_probability});
  }
  const values=conditional.map(x=>x.playoff_probability);
  return {game_id:gameId,focus_team:focus,base_playoff_probability:basePS,conditional,impact_range:Number((Math.max(...values)-Math.min(...values)).toFixed(6))};
}
