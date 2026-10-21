import {build} from 'esbuild';
import {mkdir,readdir,unlink} from 'node:fs/promises';
const outdir='server/profile-runtime';await mkdir(outdir,{recursive:true});
for(const name of await readdir(outdir))if(name.endsWith('.mjs'))await unlink(`${outdir}/${name}`);
await build({entryPoints:['server/profile-document.tsx'],outdir,entryNames:'profile-document',chunkNames:'[name]-[hash]',outExtension:{'.js':'.mjs'},bundle:true,splitting:true,format:'esm',platform:'node',target:'node24',define:{'process.env.NODE_ENV':'"production"'},banner:{js:"import {createRequire as profileCreateRequire} from 'node:module'; const require=profileCreateRequire(import.meta.url);"},loader:{'.css':'empty'},jsx:'automatic',logLevel:'warning'});
console.log('Built the shared profile components for settled document first paint.');
