export function buildHanhwaNowReport({simulation,uncertainty=null,sensitivity=null,generatedAt=new Date().toISOString()}={}){
  if(!simulation)throw new Error('simulation required');
  const rank=simulation.monte_carlo?.rank_distribution??{};
  const rows=Object.entries(rank).sort((a,b)=>Number(a[0])-Number(b[0])).map(([r,v])=>({rank:Number(r),probability:Number(v.probability??0)}));
  const expected=rows.reduce((s,r)=>s+r.rank*r.probability,0);
  return {schema_version:'1.0',model_version:'0.8.7',generated_at:generatedAt,as_of:simulation.as_of,focus_team:simulation.focus_team,iterations:simulation.iterations,future_games:simulation.future_games,summary:{playoff_probability:simulation.playoff_probability,expected_rank:Number(expected.toFixed(3)),most_likely_rank:rows.sort((a,b)=>b.probability-a.probability)[0]?.rank??null},rank_distribution:rows.sort((a,b)=>a.rank-b.rank),uncertainty,sensitivity,provenance:{source_status:simulation.source_status??'fixture',simulation_seed:simulation.seed??null}};
}
export function validateReport(report){const ok=report?.schema_version==='1.0'&&Array.isArray(report.rank_distribution)&&Number.isFinite(report.summary?.expected_rank)&&Number.isFinite(report.summary?.playoff_probability)&&Array.isArray(report.rank_distribution)&&report.provenance?.source_status;return {status:ok?'PASS':'FAIL'};}
