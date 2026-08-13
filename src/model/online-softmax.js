const CLASSES = ['HOME_WIN','DRAW','AWAY_WIN'];
const sigmoidClamp = x => Math.max(-30, Math.min(30, x));
function softmax(z) { const m=Math.max(...z); const e=z.map(v=>Math.exp(sigmoidClamp(v-m))); const s=e.reduce((a,b)=>a+b,0); return e.map(v=>v/s); }

export function predictSoftmax(weights, features) {
  const z = CLASSES.map(c => weights[c].bias + features.reduce((s,x,i)=>s+weights[c].w[i]*x,0));
  const p=softmax(z); return Object.fromEntries(CLASSES.map((c,i)=>[c,p[i]]));
}
export function createWeights(n) { return Object.fromEntries(CLASSES.map(c=>[c,{bias:0,w:Array(n).fill(0)}])); }
export function updateSoftmax(weights, features, actual, { learningRate=0.03, l2=0.0001 }={}) {
  const probs=predictSoftmax(weights,features);
  for (const c of CLASSES) {
    const y=actual===c?1:0, err=probs[c]-y;
    weights[c].bias -= learningRate*(err + l2*weights[c].bias);
    for(let i=0;i<features.length;i++) weights[c].w[i] -= learningRate*(err*features[i] + l2*weights[c].w[i]);
  }
  return probs;
}
