import { predictIntegrated, buildStrengthParts } from './integrated-prediction.js';
import { outcomeFromGame } from '../engine/elo.js';

const CLASSES=['HOME_WIN','DRAW','AWAY_WIN'];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;

function sortedFinalGames(games=[]){
  return games.filter(g=>g.status==='FINAL'||g.status==='FINISHED')
    .slice().sort((a,b)=>a.date.localeCompare(b.date)||String(a.game_id).localeCompare(String(b.game_id)));
}

function initialState(teams){
  return {elo:Object.fromEntries(teams.map(t=>[t,1500])),trend:Object.fromEntries(teams.map(t=>[t,0])),wins:{},losses:{},homeWins:{},homeGames:{},awayWins:{},awayGames:{}};
}

function featuresFromState(s,g){
  const he=s.elo[g.home]??1500, ae=s.elo[g.away]??1500;
  const htrend=s.trend[g.home]??0, atrend=s.trend[g.away]??0;
  const hrec=(s.wins[g.home]??0)-(s.losses[g.home]??0);
  const arec=(s.wins[g.away]??0)-(s.losses[g.away]??0);
  const hh=s.homeGames[g.home]??0, ha=s.awayGames[g.away]??0;
  const hform=hh?((s.homeWins[g.home]??0)/hh):0.5;
  const aform=ha?((s.awayWins[g.away]??0)/ha):0.5;
  const hp=buildStrengthParts({
    elo:(he-1500)/400,
    recent:htrend/100,
    roster:0,starter:0,bullpen:0,offense:0,defense:0
  });
  const ap=buildStrengthParts({
    elo:(ae-1500)/400,
    recent:atrend/100,
    roster:0,starter:0,bullpen:0,offense:0,defense:0
  });
  return {home:hp,away:ap,meta:{recordDiff:(hrec-arec)/20,homeFormDiff:hform-aform}};
}

function apply(s,g,k=20){
  const h=s.elo[g.home]??1500,a=s.elo[g.away]??1500;
  const exp=1/(1+10**(-(h-a)/400));
  const o=outcomeFromGame(g); const actual=o==='HOME_WIN'?1:o==='DRAW'?0.5:0;
  const d=k*(actual-exp); s.elo[g.home]=h+d; s.elo[g.away]=a-d;
  s.trend[g.home]=(s.trend[g.home]??0)*0.8+d; s.trend[g.away]=(s.trend[g.away]??0)*0.8-d;
  s.homeGames[g.home]=(s.homeGames[g.home]??0)+1; s.awayGames[g.away]=(s.awayGames[g.away]??0)+1;
  if(o==='HOME_WIN'){s.homeWins[g.home]=(s.homeWins[g.home]??0)+1;s.wins[g.home]=(s.wins[g.home]??0)+1;s.losses[g.away]=(s.losses[g.away]??0)+1;}
  else if(o==='AWAY_WIN'){s.awayWins[g.away]=(s.awayWins[g.away]??0)+1;s.wins[g.away]=(s.wins[g.away]??0)+1;s.losses[g.home]=(s.losses[g.home]??0)+1;}
}

function score(rows){
  let ll=0,b=0,correct=0;
  for(const r of rows){
    ll-=Math.log(Math.max(r.probs[r.actual],1e-15));
    for(const c of CLASSES)b+=(r.probs[c]-(r.actual===c?1:0))**2;
    const pred=CLASSES.reduce((best,c)=>r.probs[c]>r.probs[best]?c:best,CLASSES[0]);
    if(pred===r.actual)correct++;
  }
  const n=rows.length||1;
  return {games:rows.length,accuracy:correct/n,log_loss:ll/n,brier_score:b/n};
}

function evaluate(games, weights, range){
  const teams=[...new Set(games.flatMap(g=>[g.home,g.away]))];
  const s=initialState(teams), rows=[];
  games.forEach((g,i)=>{
    const f=featuresFromState(s,g);
    if(i>=range[0] && i<range[1]) rows.push({actual:outcomeFromGame(g),probs:predictIntegrated(f.home,f.away,{weights}).probabilities,game_id:g.game_id});
    apply(s,g);
  });
  return score(rows);
}

export function chronologicalSplit(games,trainFraction=0.7){
  const gs=sortedFinalGames(games); const cut=clamp(Math.floor(gs.length*trainFraction),1,Math.max(1,gs.length-1));
  return {games:gs,train:[0,cut],validation:[cut,gs.length],cut};
}

export function optimizeIntegratedWeights(games, options={}){
  const {games:gs,train,validation,cut}=chronologicalSplit(games,options.trainFraction??0.7);
  let weights={...options.initialWeights};
  if(!weights.elo && weights.elo!==0) weights={elo:1,roster:.55,starter:.75,bullpen:.35,offense:.55,defense:.25,recent:.30,home:.15,drawBase:.23,drawBalance:.10};
  const fields=options.fields??['elo','recent','home'];
  const steps=options.steps??[0.25,0.1,0.05,0.02];
  const history=[];
  const trainMetric=()=>evaluate(gs,weights,train).log_loss;
  for(const step of steps){
    let improved=true;
    while(improved){
      improved=false; const base=trainMetric();
      for(const field of fields){
        const original=finite(weights[field]);
        let best=original,bestLoss=base;
        for(const dir of [-1,1]){
          const candidate=clamp(original+dir*step,-3,3); weights[field]=candidate;
          const loss=trainMetric();
          if(loss<bestLoss-1e-10){best=candidate;bestLoss=loss;}
        }
        weights[field]=best;
        if(best!==original){improved=true;history.push({field,step,value:best,train_log_loss:bestLoss});}
      }
    }
  }
  return {split:{total:gs.length,cut,train_games:cut,validation_games:gs.length-cut},weights,train_metrics:evaluate(gs,weights,train),validation_metrics:evaluate(gs,weights,validation),history};
}

export function evaluateIntegratedBacktest(games, options={}){
  const baseline={elo:1,roster:.55,starter:.75,bullpen:.35,offense:.55,defense:.25,recent:.30,home:.15,drawBase:.23,drawBalance:.10};
  const optimized=optimizeIntegratedWeights(games,{...options,initialWeights:{...baseline,...(options.initialWeights||{})}});
  return {baseline:baseline,baseline_train:evaluate(chronologicalSplit(games).games,baseline,chronologicalSplit(games).train),baseline_validation:evaluate(chronologicalSplit(games).games,baseline,chronologicalSplit(games).validation),optimized};
}
