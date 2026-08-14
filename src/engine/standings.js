export function cloneTeams(teams){return teams.map(t=>({...t}));}
export function winRate(t){const d=t.wins+t.losses;return d?t.wins/d:0;}
export function rankTeams(teams){const sorted=cloneTeams(teams).sort((a,b)=>{const d=winRate(b)-winRate(a);return Math.abs(d)>1e-12?d:b.wins-a.wins;});let prevRate=null;let prevRank=0;return sorted.map((t,i)=>{const rate=winRate(t);const rank=prevRate!==null&&Math.abs(rate-prevRate)<1e-12?prevRank:i+1;prevRate=rate;prevRank=rank;return {...t,games:t.wins+t.losses+t.draws,rank,win_rate:Number(rate.toFixed(3))};});}
function headToHeadNet(clusterTeams,games){
  const net=Object.fromEntries(clusterTeams.map(t=>[t,0]));
  for(const g of games){
    if(g.status!=='FINAL')continue;
    if(!clusterTeams.includes(g.home)||!clusterTeams.includes(g.away))continue;
    if(g.home_score===g.away_score)continue;
    const winner=g.home_score>g.away_score?g.home:g.away,loser=winner===g.home?g.away:g.home;
    net[winner]+=1;net[loser]-=1;
  }
  return net;
}

/**
 * Like rankTeams, but resolves win-rate ties to one definite rank per team instead of
 * sharing a rank number — for a season (real or simulated) that is fully decided, where
 * KBO's actual regulation applies: win rate -> head-to-head record among the tied teams ->
 * a single winner-take-the-spot game if still tied. `games` should be every FINAL game of
 * the season (already-completed + simulated) so head-to-head has something to look at;
 * `options.random` (default Math.random) is only consumed when a tie survives head-to-head.
 */
export function rankTeamsFinal(teams,games=[],options={}){
  const random=options.random??Math.random;
  const groups=new Map();
  for(const t of cloneTeams(teams)){
    const key=winRate(t).toFixed(9);
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(t);
  }
  const orderedGroups=[...groups.entries()].sort((a,b)=>Number(b[0])-Number(a[0]));
  const finalOrder=[];
  for(const[,group]of orderedGroups){
    if(group.length===1){finalOrder.push(group[0]);continue;}
    const net=headToHeadNet(group.map(t=>t.team),games);
    finalOrder.push(...group.slice().sort((a,b)=>{
      const d=net[b.team]-net[a.team];
      return Math.abs(d)>1e-9?d:random()-0.5;
    }));
  }
  return finalOrder.map((t,i)=>({...t,games:t.wins+t.losses+t.draws,rank:i+1,win_rate:Number(winRate(t).toFixed(3))}));
}

export function applyGame(teams,g){if(g.status&&g.status!=="FINAL")return cloneTeams(teams);const n=cloneTeams(teams),h=n.find(t=>t.team===g.home),a=n.find(t=>t.team===g.away);if(!h||!a)throw new Error(`Unknown team: ${g.home}/${g.away}`);if(g.home_score>g.away_score){h.wins++;a.losses++;}else if(g.home_score<g.away_score){a.wins++;h.losses++;}else{h.draws++;a.draws++;}return n;}
export function applyGames(teams,games){return games.reduce(applyGame,teams);}
