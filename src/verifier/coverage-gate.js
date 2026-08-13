export function assertCoverage({teams, expectedTeams=10, finalGames, minFinalGames=1}={}){
 if(!Array.isArray(teams)||teams.length!==expectedTeams) throw new Error(`coverage blocked: expected ${expectedTeams} teams`);
 if(!Number.isInteger(finalGames)||finalGames<minFinalGames) throw new Error('coverage blocked: insufficient FINAL games');
 return {status:'PASS',teams:teams.length,final_games:finalGames};
}
