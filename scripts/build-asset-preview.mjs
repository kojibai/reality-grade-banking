import {build} from 'esbuild';
import {mkdir,readdir,unlink} from 'node:fs/promises';
const outdir='server/asset-runtime';await mkdir(outdir,{recursive:true});
for(const name of await readdir(outdir))if(name.endsWith('.mjs'))await unlink(`${outdir}/${name}`);
await build({entryPoints:['server/asset-preview.ts'],outdir,entryNames:'asset-preview',chunkNames:'[name]-[hash]',outExtension:{'.js':'.mjs'},bundle:true,splitting:true,packages:'external',format:'esm',platform:'node',target:'node24',logLevel:'warning'});
console.log('Built read-only asset previews from existing public readers; PNG renderer remains lazy.');
