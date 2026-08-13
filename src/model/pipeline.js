import { runIntegratedMonteCarlo } from './integrated-monte-carlo.js';
import { runModelUncertainty } from './model-uncertainty.js';
import { runStrengthSensitivity } from './sensitivity.js';
import { buildHanhwaNowReport, validateReport } from './report.js';

export function runProductionPipeline(input={},options={}){
  const sourceStatus=input.sourceStatus??'fixture';
  const allowFixture=options.allowFixture===true;
  if(sourceStatus!=='live'&&!allowFixture) throw new Error(`production gate blocked: source_status=${sourceStatus}`);
  const simulation={...runIntegratedMonteCarlo({...input,iterations:options.iterations??100000,seed:options.seed??20260812}),source_status:sourceStatus};
  const uncertainty=options.uncertainty===false?null:runModelUncertainty({...input},{members:options.members??12,iterations:options.uncertaintyIterations??5000,seed:(options.seed??20260812)+100});
  const sensitivity=options.sensitivity===false?null:runStrengthSensitivity({...input},{focusTeam:input.focusTeam??'HANWHA',iterations:options.sensitivityIterations??5000,seed:(options.seed??20260812)+200});
  const report=buildHanhwaNowReport({simulation,uncertainty,sensitivity});
  const validation=validateReport(report);
  if(validation.status!=='PASS') throw new Error('report validation failed');
  return {status:'PASS',report};
}
