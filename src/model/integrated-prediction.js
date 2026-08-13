const CLASSES = ['HOME_WIN','DRAW','AWAY_WIN'];
const EPS = 1e-9;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const sigmoid=x=>1/(1+Math.exp(-clamp(x,-30,30)));

export const DEFAULT_WEIGHTS = Object.freeze({
  elo: 1.00,
  roster: 0.55,
  starter: 0.75,
  bullpen: 0.35,
  offense: 0.55,
  defense: 0.25,
  recent: 0.30,
  home: 0.15,
  drawBase: 0.23,
  drawBalance: 0.10
});

function n(v,d=0){const x=Number(v);return Number.isFinite(x)?x:d;}
function logistic3(x,draw){
  const h=1/(1+Math.exp(-clamp(x,-8,8)));
  const d=clamp(draw,0.05,0.40);
  return {HOME_WIN:(1-d)*h,DRAW:d,AWAY_WIN:(1-d)*(1-h)};
}

export function strengthScore(parts={}, weights=DEFAULT_WEIGHTS){
  const w=weights;
  return w.elo*n(parts.elo)+w.roster*n(parts.roster)+w.starter*n(parts.starter)+
    w.bullpen*n(parts.bullpen)+w.offense*n(parts.offense)+w.defense*n(parts.defense)+w.recent*n(parts.recent);
}

export function predictIntegrated(home={}, away={}, options={}){
  const w={...DEFAULT_WEIGHTS,...(options.weights||{})};
  const h=strengthScore(home,w), a=strengthScore(away,w);
  const diff=h-a+w.home;
  const balance=1-Math.min(1,Math.abs(diff)/4);
  const draw=clamp(w.drawBase+w.drawBalance*balance,0.12,0.32);
  const p=logistic3(diff,draw);
  return {probabilities:p,home_score:h,away_score:a,differential:diff,draw_probability:p.DRAW};
}

export function buildStrengthParts({elo=0, roster=0, starter=0, bullpen=0, offense=0, defense=0, recent=0}={}){
  return {elo:n(elo),roster:n(roster),starter:n(starter),bullpen:n(bullpen),offense:n(offense),defense:n(defense),recent:n(recent)};
}

export function brierScore(probs, actual){
  return CLASSES.reduce((s,c)=>s+Math.pow(n(probs[c])- (actual===c?1:0),2),0);
}
export function logLoss(probs, actual){return -Math.log(Math.max(EPS,n(probs[actual])));}

export function updateOnlineWeights(weights, featureDiff, actual, options={}){
  const lr=n(options.learningRate,0.01), l2=n(options.l2,0.0001);
  const pred=predictIntegrated(featureDiff.home,featureDiff.away,{weights});
  // Gradient-free bounded coordinate update: move the composite differential toward the observed class.
  const sign=actual==='HOME_WIN'?1:actual==='AWAY_WIN'?-1:0;
  const error=actual==='DRAW' ? (0.5-pred.probabilities.DRAW) : sign-(pred.probabilities.HOME_WIN-pred.probabilities.AWAY_WIN);
  const fields=['elo','roster','starter','bullpen','offense','defense','recent'];
  for(const f of fields){
    const x=n(featureDiff.home[f])-n(featureDiff.away[f]);
    weights[f]=clamp(n(weights[f])-lr*(error*x+l2*n(weights[f])), -3,3);
  }
  return pred;
}
