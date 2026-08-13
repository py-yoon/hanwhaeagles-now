export function validateGames(games){
  const errors=[]; const ids=new Set();
  for(const g of games){
    if(ids.has(g.game_id)) errors.push({game_id:g.game_id,reason:'DUPLICATE_GAME_ID'}); ids.add(g.game_id);
    if(g.status==='FINISHED' || g.status==='FINAL'){
      if(!Number.isFinite(g.home_score)||!Number.isFinite(g.away_score)) errors.push({game_id:g.game_id,reason:'MISSING_FINAL_SCORE'});
    }
    if(g.status==='SCHEDULED' && (g.home_score!==null||g.away_score!==null)) errors.push({game_id:g.game_id,reason:'SCHEDULED_HAS_SCORE'});
  }
  return {status:errors.length?'FAIL':'PASS',count:games.length,errors};
}
