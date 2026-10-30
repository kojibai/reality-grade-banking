import {build} from 'esbuild';
import {mkdir,readdir,readFile,writeFile,unlink} from 'node:fs/promises';
import {basename} from 'node:path';
const outdir='server/asset-runtime';await mkdir(outdir,{recursive:true});
const result=await build({entryPoints:['server/asset-preview.ts'],outdir,entryNames:'asset-preview',chunkNames:'[name]-[hash]',outExtension:{'.js':'.mjs'},bundle:true,splitting:true,packages:'external',format:'esm',platform:'node',target:'node24',logLevel:'warning',write:false});
// An unchanged generation must not tear down an active dev server. Publish new
// chunks before their entry, then remove obsolete outputs after the new graph.
const outputs=result.outputFiles.sort((a,b)=>Number(basename(a.path)==='asset-preview.mjs')-Number(basename(b.path)==='asset-preview.mjs'));
for(const file of outputs){const bytes=Buffer.from(file.contents),held=await readFile(file.path).catch(error=>{if(error.code!=='ENOENT')throw error;return null;});if(!held?.equals(bytes))await writeFile(file.path,bytes);}
const wanted=new Set(outputs.map(file=>basename(file.path)));
for(const name of await readdir(outdir))if(name.endsWith('.mjs')&&!wanted.has(name))await unlink(`${outdir}/${name}`);
console.log('Built read-only asset previews from existing public readers; PNG renderer remains lazy.');
