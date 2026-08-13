import fs from 'node:fs/promises';import {collectSeason} from './kbo.js';
const season=Number(process.argv[2]??new Date().getFullYear());
const out=process.argv[3]??`data/raw/${season}-regular-games.json`;
const games=await collectSeason({season});await fs.mkdir(new URL('.',`file://${process.cwd()}/${out}`).pathname,{recursive:true}).catch(()=>{});await fs.writeFile(out,JSON.stringify({season,collected_at:new Date().toISOString(),games},null,2));console.log(`Collected ${games.length} games -> ${out}`);
