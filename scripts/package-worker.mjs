import { readFile, writeFile, readdir, mkdir, copyFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
// A self-contained Worker artifact also serves the built client without asset bindings.
const assets = {};
async function walk(dir) { for(const item of await readdir(dir,{withFileTypes:true})) { const path=join(dir,item.name); if(item.isDirectory()) await walk(path); else assets['/'+relative('dist/client',path).replaceAll('\\','/')] = Buffer.from(await readFile(path)).toString('base64'); } }
await walk('dist/client');
const file='dist/server/index.js';
const code=await readFile(file,'utf8');
await writeFile(file,code+'\nconst EMBEDDED_ASSETS = '+JSON.stringify(assets)+';\n');

await mkdir('dist/.openai',{recursive:true});
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
