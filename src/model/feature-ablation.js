import { createWeights, updateSoftmax } from './online-softmax.js';
import { outcomeFromGame } from '../engine/elo.js';

const FEATURES = {
  elo_diff: (s,g) => [((s.elo[g.home]??1500) - (s.elo[g.away]??1500))/400],
  home_form: (s,g) => { const hw=s.homeWins[g.home]??0, hg=s.homeGames[g.home]??0, aw=s.awayWins[g.away]??0, ag=s.awayGames[g.away]??0; return [((hg?hw/hg:0.5)-(ag?aw/ag:0.5))]; },
  recent_elo_trend: (s,g) => [((s.trend[g.home]??0)-(s.trend[g.away]??0))/100],
  record_diff: (s,g) => [((s.wins[g.home]??0)-(s.losses[g.home]??0) - ((s.wins[g.away]??0)-(s.losses[g.away]??0)))/20],
};

function stateFor(teams){ return {elo:Object.fromEntries(teams.map(t=>[t,1500])), trend:Object.fromEntries(teams.map(t=>[t,0])), wins:{}, losses:{}, draws:{}, homeWins:{}, homeGames:{}, awayWins:{}, awayGames:{}}; }
function applyState(s,g,k=20){
  const h=s.elo[g.home]??1500,a=s.elo[g.away]??1500;
  const exp=1/(1+10**(-(h-a)/400)); const actual=outcomeFromGame(g)==='HOME_WIN'?1:outcomeFromGame(g)==='DRAW'?0.5:0;
  const d=k*(actual-exp); s.elo[g.home]=h+d; s.elo[g.away]=a-d;
  s.trend[g.home]=(s.trend[g.home]??0)*0.8+d; s.trend[g.away]=(s.trend[g.away]??0)*0.8-d;
  const o=outcomeFromGame(g); s.homeGames[g.home]=(s.homeGames[g.home]??0)+1; s.awayGames[g.away]=(s.awayGames[g.away]??0)+1; if(o==='HOME_WIN'){s.homeWins[g.home]=(s.homeWins[g.home]??0)+1;s.wins[g.home]=(s.wins[g.home]??0)+1;s.losses[g.away]=(s.losses[g.away]??0)+1;} else if(o==='AWAY_WIN'){s.awayWins[g.away]=(s.awayWins[g.away]??0)+1;s.wins[g.away]=(s.wins[g.away]??0)+1;s.losses[g.home]=(s.losses[g.home]??0)+1;} else {s.draws[g.home]=(s.draws[g.home]??0)+1;s.draws[g.away]=(s.draws[g.away]??0)+1;}
}
function metric(rows){let ll=0,b=0,correct=0;for(const r of rows){ll-=Math.log(Math.max(r.probs[r.actual],1e-15));for(const c of ['HOME_WIN','DRAW','AWAY_WIN']){const y=r.actual===c?1:0;b+=(r.probs[c]-y)**2;}if(Object.entries(r.probs).sort((a,b)=>b[1]-a[1])[0][0]===r.actual)correct++;}const n=rows.length;return {games:n,accuracy:n?correct/n:0,log_loss:n?ll/n:0,brier_score:n?b/n:0};}

export function runFeatureAblation(games,{featureSets={elo:['elo_diff'],elo_recent:['elo_diff','recent_elo_trend'],elo_record:['elo_diff','record_diff'],elo_homeform:['elo_diff','home_form'],full:['elo_diff','recent_elo_trend','record_diff','home_form']},learningRate=0.03,l2=0.0001,teams}={}){
  const finalGames=games.filter(g=>g.status==='FINAL'||g.status==='FINISHED').sort((a,b)=>a.date.localeCompare(b.date)||String(a.game_id).localeCompare(String(b.game_id)));
  const teamList=teams??[...new Set(finalGames.flatMap(g=>[g.home,g.away]))]; const results=[];
  for(const [name,keys] of Object.entries(featureSets)){
    const weights=createWeights(keys.length), state=stateFor(teamList), rows=[];
    for(const g of finalGames){const features=keys.flatMap(k=>FEATURES[k](state,g));const actual=outcomeFromGame(g);const probs=updateSoftmax(weights,features,actual,{learningRate,l2});rows.push({actual,probs});applyState(state,g);}
    results.push({name,features:keys,weights,metrics:metric(rows)});
  }
  return {results,best_by_log_loss:[...results].sort((a,b)=>a.metrics.log_loss-b.metrics.log_loss)[0]??null,best_by_brier:[...results].sort((a,b)=>a.metrics.brier_score-b.metrics.brier_score)[0]??null};
}
