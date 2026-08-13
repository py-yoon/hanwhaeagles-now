const EPS = 1e-9;

function num(v, d=0){ const n=Number(v); return Number.isFinite(n)?n:d; }
function rate(a,b, fallback=0){ a=num(a); b=num(b); return b>0 ? a/b : fallback; }
function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }

export const BATTER_FIELDS = ['PA','AB','H','2B','3B','HR','RBI','BB','HBP','SO','SB','CS','TB','SF'];
export const PITCHER_FIELDS = ['G','IP','H','HR','BB','HBP','SO','R','ER','TBF','NP','W','L','SV','HLD'];

export function normalizePlayerStatRow(row={}) {
  return {
    player_id: String(row.player_id ?? row.playerId ?? ''),
    team: String(row.team ?? ''),
    as_of: String(row.as_of ?? row.date ?? ''),
    PA:num(row.PA), AB:num(row.AB), H:num(row.H), doubles:num(row['2B'] ?? row.doubles), triples:num(row['3B'] ?? row.triples), HR:num(row.HR), RBI:num(row.RBI), BB:num(row.BB), HBP:num(row.HBP), SO:num(row.SO), SB:num(row.SB), CS:num(row.CS), TB:num(row.TB), SF:num(row.SF),
    G:num(row.G), IP:num(row.IP), pitcher_H:num(row.H), pitcher_HR:num(row.HR), pitcher_BB:num(row.BB), pitcher_HBP:num(row.HBP), pitcher_SO:num(row.SO), R:num(row.R), ER:num(row.ER), TBF:num(row.TBF), NP:num(row.NP), W:num(row.W), L:num(row.L), SV:num(row.SV), HLD:num(row.HLD)
  };
}

function batterFeatures(rows){
  const PA=rows.reduce((s,r)=>s+r.PA,0), AB=rows.reduce((s,r)=>s+r.AB,0), H=rows.reduce((s,r)=>s+r.H,0), TB=rows.reduce((s,r)=>s+r.TB,0), BB=rows.reduce((s,r)=>s+r.BB,0), HBP=rows.reduce((s,r)=>s+r.HBP,0), SF=rows.reduce((s,r)=>s+r.SF,0), HR=rows.reduce((s,r)=>s+r.HR,0), SO=rows.reduce((s,r)=>s+r.SO,0);
  const obp=rate(H+BB+HBP,AB+BB+HBP+SF,0.300), slg=rate(TB,AB,0.400);
  return {pa:PA, avg:rate(H,AB,0.250), obp, slg, ops:obp+slg, hr_rate:rate(HR,PA), bb_rate:rate(BB,PA), so_rate:rate(SO,PA)};
}

function pitcherFeatures(rows){
  const IP=rows.reduce((s,r)=>s+r.IP,0), TBF=rows.reduce((s,r)=>s+r.TBF,0), ER=rows.reduce((s,r)=>s+r.ER,0), H=rows.reduce((s,r)=>s+r.pitcher_H,0), HR=rows.reduce((s,r)=>s+r.pitcher_HR,0), BB=rows.reduce((s,r)=>s+r.pitcher_BB,0), SO=rows.reduce((s,r)=>s+r.pitcher_SO,0);
  return {ip:IP, era:IP>0?ER/IP*9:4.50, whip:IP>0?(H+BB)/IP:1.40, k9:IP>0?SO/IP*9:7.5, bb9:IP>0?BB/IP*9:3.2, hr9:IP>0?HR/IP*9:1.0, k_rate:rate(SO,TBF,0.20), bb_rate:rate(BB,TBF,0.08)};
}

export function aggregateTeamPlayerStats(rows, options={}) {
  const asOf=options.asOf ? String(options.asOf) : null;
  const eligible=rows.map(normalizePlayerStatRow).filter(r=>r.team && (!asOf || !r.as_of || r.as_of<=asOf));
  const teams=[...new Set(eligible.map(r=>r.team))];
  return Object.fromEntries(teams.map(team=>{
    const rs=eligible.filter(r=>r.team===team);
    return [team,{team,as_of:asOf,players:rs.length,batter:batterFeatures(rs),pitcher:pitcherFeatures(rs)}];
  }));
}

export function shrinkRate(value, sample, prior=0.5, priorWeight=100){
  const n=Math.max(0,num(sample));
  return (num(value)*n + prior*priorWeight)/(n+priorWeight);
}

export function teamFeatureVector(teamStats, {baseline={}}={}) {
  const b=teamStats?.batter ?? {}, p=teamStats?.pitcher ?? {};
  const base={
    ops:baseline.ops ?? 0.700, era:baseline.era ?? 4.50, whip:baseline.whip ?? 1.40,
    k9:baseline.k9 ?? 7.5, bb9:baseline.bb9 ?? 3.2, hr_rate:baseline.hr_rate ?? 0.025,
    so_rate:baseline.so_rate ?? 0.20
  };
  return {
    batting_ops:clamp((num(b.ops)-base.ops),-1,1),
    batting_avg:clamp((num(b.avg)-0.250),-0.5,0.5),
    hr_rate:clamp((num(b.hr_rate)-base.hr_rate)*10,-1,1),
    bb_rate:clamp((num(b.bb_rate)-0.08)*5,-1,1),
    so_rate:clamp((base.so_rate-num(b.so_rate))*5,-1,1),
    pitching_era:clamp((base.era-num(p.era))/2,-3,3),
    pitching_whip:clamp((base.whip-num(p.whip)), -1,1),
    pitching_k9:clamp((num(p.k9)-base.k9)/3,-2,2),
    pitching_bb9:clamp((base.bb9-num(p.bb9))/2,-2,2),
    pitching_hr9:clamp((base.hr_rate*40-num(p.hr9))/3,-2,2)
  };
}

export function makePregamePlayerSnapshot(rows, asOf){
  const cutoff=String(asOf);
  const bad=rows.filter(r=>r.as_of && String(r.as_of)>cutoff);
  if(bad.length) throw new Error(`Look-ahead player stats detected: ${bad.length} rows after ${cutoff}`);
  return aggregateTeamPlayerStats(rows,{asOf:cutoff});
}

export function playerFeatureDiff(homeStats, awayStats){
  const h=teamFeatureVector(homeStats), a=teamFeatureVector(awayStats);
  return Object.fromEntries(Object.keys(h).map(k=>[k,h[k]-a[k]]));
}
