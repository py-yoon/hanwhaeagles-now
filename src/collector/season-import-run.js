import { collectMonth } from './kbo.js';
import { collectSeasonCheckpoints } from './season-import.js';
import { auditCheckpointChain } from './season-import.js';

const season = Number(process.argv[2] ?? new Date().getFullYear());
const months = (process.argv[3] ?? '3,4,5,6,7,8').split(',').map(Number);
const checkpoints = await collectSeasonCheckpoints({ season, months, collect: collectMonth });
const files = checkpoints.map((x) => x.file);
console.log(JSON.stringify({ season, checkpoints, files }, null, 2));
console.log('Run audit against checkpoint files after collection.');
