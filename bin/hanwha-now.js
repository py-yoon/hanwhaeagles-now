#!/usr/bin/env node
import { runProductionCliPipeline } from '../src/cli/pipeline-run.js';

function parseArgs(argv) {
  const args = { officialFiles: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--as-of': args.asOf = next(); break;
      case '--iterations': args.iterations = Number(next()); break;
      case '--seed': args.seed = Number(next()); break;
      case '--k-factor': args.kFactor = Number(next()); break;
      case '--home-advantage': args.homeAdvantage = Number(next()); break;
      case '--games': args.gamesFile = next(); break;
      case '--official': args.officialFiles.push(next()); break;
      case '--player-stats': args.playerStatsFile = next(); break;
      case '--team-stats': args.teamStatsFile = next(); break;
      case '--focus-team': args.focusTeam = next(); break;
      case '--source-status': args.sourceStatus = next(); break;
      case '--allow-fixture': args.allowFixture = true; break;
      case '--out': args.outDir = next(); break;
      default:
        if (a.startsWith('--')) throw new Error(`Unknown flag: ${a}`);
    }
  }
  return args;
}

function usage() {
  return [
    'Usage: hanwha-now run --as-of YYYY-MM-DD [options]',
    '',
    'Options:',
    '  --iterations <n>       Monte Carlo iterations (default 100000)',
    '  --seed <n>             Deterministic RNG seed (default 20260812)',
    '  --k-factor <n>         Elo K-factor (default 10, validated via V0.9.4 held-out backtest)',
    '  --home-advantage <n>   Elo home-advantage points (default 25, validated via V0.9.4 held-out backtest)',
    '  --games <file>         Games JSON file (default: fixture demo data)',
    '  --official <file>      Official standings snapshot (repeatable)',
    '  --player-stats <file>  Per-player stat rows JSON (optional)',
    '  --team-stats <file>    Team-level batting/pitching aggregate JSON, e.g. from',
    '                         `npm run collect:team-stats` (optional, opt-in, unvalidated',
    '                         signal — see CHANGELOG-v0.9.5.md)',
    '  --focus-team <team>    Team code to focus on (default HANWHA)',
    '  --source-status <s>    "live" or "fixture" (default fixture)',
    '  --allow-fixture        Allow fixture-labeled data through the production gate (non-production use only)',
    '  --out <dir>            Write intermediate artifacts + report under this directory',
  ].join('\n');
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (command !== 'run') {
    console.log(usage());
    process.exitCode = command ? 1 : 0;
    return;
  }
  const args = parseArgs(rest);
  if (!args.officialFiles.length) delete args.officialFiles;

  const result = await runProductionCliPipeline({
    ...args,
    write: Boolean(args.outDir),
  });

  if (result.status !== 'PASS') {
    console.error(JSON.stringify({ status: result.status, stage: result.stage, reason: result.reason }, null, 2));
    process.exitCode = 2;
    return;
  }

  console.log(JSON.stringify(result.report, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ status: 'ERROR', reason: err.message }, null, 2));
  process.exitCode = 1;
});
