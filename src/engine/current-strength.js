const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;

export const DEFAULT_COMPONENT_WEIGHTS=Object.freeze({
  elo:0.40, roster:0.16, starter:0.14, bullpen:0.08,
  offense:0.10, defense:0.04, recent:0.08
});

export function weightedStrength(parts={}, weights=DEFAULT_COMPONENT_WEIGHTS){
  const keys=Object.keys(DEFAULT_COMPONENT_WEIGHTS);
  let total=0, denom=0;
  for(const k of keys){
    const w=Math.max(0,n(weights[k],0));
    total+=n(parts[k],0)*w;
    denom+=w;
  }
  return denom ? total/denom : 0;
}

export function componentConfidence({games=0, players=0, starterSamples=0, bullpenIP=0}={}){
  const gameC=1-Math.exp(-Math.max(0,n(games))/30);
  const playerC=1-Math.exp(-Math.max(0,n(players))/8);
  const starterC=1-Math.exp(-Math.max(0,n(starterSamples))/5);
  const bullpenC=1-Math.exp(-Math.max(0,n(bullpenIP))/30);
  return {
    overall:Number((0.45*gameC+0.20*playerC+0.20*starterC+0.15*bullpenC).toFixed(4)),
    games:Number(gameC.toFixed(4)), players:Number(playerC.toFixed(4)),
    starter:Number(starterC.toFixed(4)), bullpen:Number(bullpenC.toFixed(4))
  };
}

export function buildCurrentStrengthSnapshot({teams, elo={}, components={}, metadata={}}={}){
  const rows=(teams??[]).map(team=>{
    const p={...components[team],elo:n(elo[team],1500)};
    const strength=weightedStrength(p);
    const confidence=componentConfidence(p.sample ?? {});
    return {
      team, as_of:metadata.asOf ?? null,
      elo:Number(n(p.elo,1500).toFixed(3)),
      components:{
        roster:Number(n(p.roster).toFixed(4)), starter:Number(n(p.starter).toFixed(4)),
        bullpen:Number(n(p.bullpen).toFixed(4)), offense:Number(n(p.offense).toFixed(4)),
        defense:Number(n(p.defense).toFixed(4)), recent:Number(n(p.recent).toFixed(4))
      },
      strength:Number(strength.toFixed(4)), confidence
    };
  }).sort((a,b)=>b.strength-a.strength||b.elo-a.elo||a.team.localeCompare(b.team));
  rows.forEach((r,i)=>{r.strength_rank=i+1;});
  return {as_of:metadata.asOf??null, source_status:metadata.sourceStatus??'fixture', rows};
}

export function validateStrengthSnapshot(snapshot, expectedTeams=10){
  const rows=snapshot?.rows??[];
  const teams=new Set(rows.map(r=>r.team));
  const duplicate=rows.length!==teams.size;
  const invalid=rows.filter(r=>!Number.isFinite(r.strength)||!Number.isFinite(r.elo));
  const ranks=rows.map(r=>r.strength_rank);
  const rankValid=ranks.length===teams.size && ranks.every((r,i)=>r===i+1);
  return {status:rows.length===expectedTeams&&!duplicate&&!invalid.length&&rankValid?'PASS':'FAIL',rows:rows.length,duplicate,invalid:invalid.map(r=>r.team),rank_valid:rankValid};
}
