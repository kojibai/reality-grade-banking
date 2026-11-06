// Separate device-only SDK publication, loaded only by an explicit upload.
import {build} from 'esbuild';
import {mkdir,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {relative,dirname} from 'node:path';
const outdir='public/registry';await mkdir(outdir,{recursive:true});
const result=await build({entryPoints:{publish:'src/registry/publish.ts'},outdir,entryNames:'[name]',chunkNames:'chunks/[name]-[hash]',bundle:true,splitting:true,format:'esm',platform:'browser',target:'es2022',external:['node:*'],minify:true,sourcemap:true,logLevel:'warning',write:false,legalComments:'inline'});
const wanted=new Set(result.outputFiles.map(file=>relative(outdir,file.path)));
const entry=file=>file.path.endsWith('/publish.js');
for(const file of result.outputFiles.sort((a,b)=>Number(entry(a))-Number(entry(b)))){
 await mkdir(dirname(file.path),{recursive:true});
 const bytes=Buffer.from(file.contents),held=await readFile(file.path).catch(error=>{if(error.code!=='ENOENT')throw error;return null;});
 if(!held?.equals(bytes))await writeFile(file.path,bytes);
}
async function prune(path=''){
 for(const file of await readdir(outdir+(path?'/'+path:''),{withFileTypes:true})){
  const name=path?path+'/'+file.name:file.name;
  if(file.isDirectory())await prune(name);
  else if(!wanted.has(name)&&/\.(?:js|map)$/.test(name))await rm(outdir+'/'+name);
 }
}
await prune();
console.log('Built lazy device-held Receiz Registry publisher; no identity or server credentials are bundled.');
