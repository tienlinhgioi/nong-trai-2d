import { spawnSync } from 'node:child_process';
import { writeFile, readFile } from 'node:fs/promises';
const config=JSON.parse(await readFile('public/game-config.json','utf8'));
if(!config.configured||!config.key?.startsWith('sb_publishable_'))throw Error('Pages requires a publishable Supabase key; never use a service-role key.');
const tsc=spawnSync(process.execPath,['node_modules/typescript/bin/tsc','--noEmit'],{stdio:'inherit'});
if(tsc.status!==0)process.exit(tsc.status??1);
const build=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--base','./','--outDir','dist/pages'],{stdio:'inherit',env:{...process.env,VITE_STATIC_HOST:'true'}});
if(build.status!==0)process.exit(build.status??1);
await writeFile('dist/pages/.nojekyll','');
