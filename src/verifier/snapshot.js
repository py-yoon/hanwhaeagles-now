import { replay, compareStandings } from './replay.js';
export function verifyDateSnapshot({date,preStandings,games,officialStandings}){
  const dated=games.filter(g=>g.date===date && (g.status==='FINAL'||g.status==='FINISHED'));
  const calculated=replay(preStandings,dated);
  return {date,games_checked:dated.length,...compareStandings(calculated,officialStandings),calculated};
}
