import {build} from 'esbuild';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const outdir='server/reading-runtime';await mkdir(outdir,{recursive:true});
const result=await build({entryPoints:['server/public-reading.ts'],outfile:outdir+'/public-reading.mjs',bundle:true,packages:'external',format:'esm',platform:'node',target:'node24',logLevel:'warning',write:false});
for(const output of result.outputFiles){const bytes=Buffer.from(output.contents),before=await readFile(output.path).catch(error=>{if(error.code!=='ENOENT')throw error;return null;});if(!before?.equals(bytes))await writeFile(output.path,bytes);}
console.log('Built separate anonymous public reading entry; app entries are unchanged.');
