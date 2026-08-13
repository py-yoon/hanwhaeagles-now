import { rankTeams, applyGames } from './standings.js';
import { createSeededRng, sampleOutcome, materializeSample } from './monte-carlo.js';

export function simulateFinalStandings(standings, games, options = {}) {
  const iterations = Number(options.iterations ?? 50000);
  const focusTeam = options.focusTeam ?? 'HANWHA';
  const random = options.seed == null ? (options.random ?? Math.random) : createSeededRng(options.seed);
  if (!Number.isInteger(iterations) || iterations <= 0) throw new Error('iterations must be a positive integer');
  const rankCounts = Object.fromEntries(Array.from({length: standings.length}, (_,i)=>[i+1,0]));
  let focusRankSum=0;
  let postseason=0;
  let champion=0;
  for(let i=0;i<iterations;i++){
    const sampled=games.map(g=>materializeSample(g,sampleOutcome(g.probabilities,random)));
    const ranked=rankTeams(applyGames(standings,sampled));
    const focus=ranked.find(t=>t.team===focusTeam);
    rankCounts[focus.rank]++;
    focusRankSum+=focus.rank;
    if(focus.rank<=5) postseason++;
    if(focus.rank===1) champion++;
  }
  const distribution=Object.fromEntries(Object.entries(rankCounts).map(([r,c])=>[r,{count:c,probability:c/iterations,percent:Number((c/iterations*100).toFixed(2))}]));
  return {iterations,focus_team:focusTeam,best_rank:Math.min(...Object.entries(rankCounts).filter(([,c])=>c).map(([r])=>Number(r))),worst_rank:Math.max(...Object.entries(rankCounts).filter(([,c])=>c).map(([r])=>Number(r))),expected_rank:Number((focusRankSum/iterations).toFixed(4)),postseason_probability:Number((postseason/iterations).toFixed(4)),championship_probability:Number((champion/iterations).toFixed(4)),rank_distribution:distribution};
}

export function gameImpact(standings, games, targetGameId, options = {}) {
  const target=games.find(g=>g.game_id===targetGameId);
  if(!target) throw new Error(`Unknown game: ${targetGameId}`);
  const iterations=Number(options.iterations ?? 10000);
  const focusTeam=options.focusTeam ?? 'HANWHA';
  const random=createSeededRng(options.seed ?? 42);
  const outcomes={HOME_WIN:'home_win_probability',AWAY_WIN:'away_win_probability',DRAW:'draw_probability'};
  const result={game_id:targetGameId,focus_team:focusTeam,conditions:{}};
  for(const forced of Object.keys(outcomes)){
    let good=0;
    for(let i=0;i<iterations;i++){
      const sampled=games.map(g=>{
        const outcome=g.game_id===targetGameId?forced:sampleOutcome(g.probabilities,random);
        return materializeSample(g,outcome);
      });
      const focus=rankTeams(applyGames(standings,sampled)).find(t=>t.team===focusTeam);
      if(focus.rank<=5) good++;
    }
    result.conditions[forced]={postseason_probability:Number((good/iterations).toFixed(4)),percent:Number((good/iterations*100).toFixed(2))};
  }
  const vals=Object.values(result.conditions).map(x=>x.postseason_probability);
  result.range_probability_points=Number(((Math.max(...vals)-Math.min(...vals))*100).toFixed(2));
  return result;
}
