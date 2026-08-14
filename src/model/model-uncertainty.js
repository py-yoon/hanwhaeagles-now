import { runIntegratedMonteCarlo } from './integrated-monte-carlo.js';
import { DEFAULT_WEIGHTS } from './integrated-prediction.js';

function quantile(xs,q){const a=[...xs].sort((x,y)=>x-y);if(!a.length)return 0;const i=(a.length-1)*q;const lo=Math.floor(i),hi=Math.ceil(i);return lo===hi?a[lo]:a[lo]+(a[hi]-a[lo])*(i-lo);}

const WEIGHT_KEYS = ['elo','roster','starter','bullpen','offense','defense','recent','home'];

export function runModelUncertainty(base,{members=20,iterations=5000,seed=20260812,relativeSigma=.08}={}){
  if(!Number.isInteger(members)||members<3)throw new Error('members must be >= 3');
  const runs=[];
  for(let i=0;i<members;i++){
    const weights={...DEFAULT_WEIGHTS};
    // Perturb each weight independently. Keying the pseudo-random offset off k.length
    // collided for every key of the same length (starter/bullpen/offense/defense are all
    // 7 characters, roster/recent both 6), so 6 of the 8 weights moved in lockstep within
    // every ensemble member instead of varying independently — the resulting p10-p90 band
    // was narrower and less representative than a real independent perturbation gives.
    WEIGHT_KEYS.forEach((k, j) => {
      const u=((seed+i*7919+j*131)%10000)/10000;
      const z=(u-.5)*2;
      weights[k]=weights[k]*(1+relativeSigma*z);
    });
    runs.push(runIntegratedMonteCarlo({...base,weights,iterations,seed:seed+i,retainSamples:false}));
  }
  const ps=runs.map(r=>r.playoff_probability);
  const ranks=runs.map(r=>r.monte_carlo?.focus_rank_distribution??{});
  const rankValues=[...new Set(runs.flatMap(r=>Object.keys(r.monte_carlo?.rank_distribution??{})))].sort((a,b)=>Number(a)-Number(b));
  const rank_distribution=Object.fromEntries(rankValues.map(rank=>{const vals=runs.map(r=>Number(r.monte_carlo.rank_distribution?.[rank]?.probability??0));return [rank,{p10:Number(quantile(vals,.1).toFixed(6)),median:Number(quantile(vals,.5).toFixed(6)),p90:Number(quantile(vals,.9).toFixed(6))}]}));
  return {model_version:'0.8.2',members,iterations,playoff_probability:{p10:Number(quantile(ps,.1).toFixed(6)),median:Number(quantile(ps,.5).toFixed(6)),p90:Number(quantile(ps,.9).toFixed(6))},rank_distribution};
}
