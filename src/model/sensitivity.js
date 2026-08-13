import { runIntegratedMonteCarlo } from './integrated-monte-carlo.js';

export const DEFAULT_SHOCKS=Object.freeze({
  starter:+0.20, bullpen:+0.15, offense:+0.15, roster:+0.15, recent:+0.10
});

export function runStrengthSensitivity(base,{focusTeam='HANWHA',iterations=10000,seed=20260812,shocks=DEFAULT_SHOCKS}={}){
  const baseline=runIntegratedMonteCarlo({...base,focusTeam,iterations,seed});
  const rows=[];
  for(const [component,delta] of Object.entries(shocks)){
    for(const direction of [1,-1]){
      const snapshots=Object.fromEntries(Object.entries(base.snapshots||{}).map(([team,s])=>{
        const copy={...s}; if(team===focusTeam) copy[component]=Number(copy[component]??0)+delta*direction; return [team,copy];
      }));
      const result=runIntegratedMonteCarlo({...base,snapshots,focusTeam,iterations,seed:seed+rows.length+1});
      rows.push({component,direction:direction>0?'positive':'negative',delta:delta*direction,playoff_probability:result.playoff_probability,change:Number((result.playoff_probability-baseline.playoff_probability).toFixed(6))});
    }
  }
  return {model_version:'0.8.3',focus_team:focusTeam,baseline_playoff_probability:baseline.playoff_probability,rows:rows.sort((a,b)=>Math.abs(b.change)-Math.abs(a.change))};
}
